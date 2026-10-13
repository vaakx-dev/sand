import { bearer, joinDisposers } from '@sand/kit'
import { isIconHash, projectIconPath } from '@sand/kit/fs'
import { fileHash, peerUrl, remoteStore } from '@sand/kit/host'
import type { ProjectFiles } from '@sand/project-files/contract'
import type { RemoteRecord } from '@sand/protocol'
import type { RouteHandler, Server } from '@sand/server/contract'

const storedPath = '/project-icon-file'

const notFound = () => new Response('not found', { status: 404 })

const fromPeer = async (record: RemoteRecord, hash: string) => {
  const url = new URL(`${storedPath}?${new URLSearchParams({ hash })}`, await peerUrl(record))
  const response = await fetch(url, { headers: bearer(record.key) })
  if (!response.ok) throw new Error(`${record.name} does not have this icon`)
  const bytes = await response.bytes()
  if (fileHash(bytes) !== hash) throw new Error(`${record.name} sent a different icon`)
  return bytes
}

const storedIcon = async (home: string, hash: string) => {
  const path = projectIconPath(home, hash)
  if (await Bun.file(path).exists()) return Bun.file(path)
  const peers = (await remoteStore(home)).list()
  const bytes = await Promise.any(peers.map(record => fromPeer(record, hash))).catch(() => undefined)
  if (!bytes) return undefined
  await Bun.write(path, bytes)
  return Bun.file(path)
}

const iconRoute =
  (home: string, files: ProjectFiles): RouteHandler =>
  async request => {
    const project = new URL(request.url).searchParams.get('project')
    const icon = files.local().projects.find(found => found.id === project)?.iconFile
    const file = icon && (await storedIcon(home, icon.hash))
    if (!icon || !file) return notFound()
    return new Response(file, {
      headers: {
        'content-type': icon.type,
        'cache-control': 'max-age=31536000, immutable',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
        'x-content-type-options': 'nosniff',
      },
    })
  }

const storedRoute =
  (home: string): RouteHandler =>
  async request => {
    const hash = new URL(request.url).searchParams.get('hash')
    if (!isIconHash(hash)) return notFound()
    const file = Bun.file(projectIconPath(home, hash))
    return (await file.exists()) ? new Response(file, { headers: { 'content-type': 'application/octet-stream' } }) : notFound()
  }

export const serveIcons = (server: Server, home: string, files: ProjectFiles) =>
  joinDisposers(server.route('/project-icon', iconRoute(home, files)), server.route(storedPath, storedRoute(home)))
