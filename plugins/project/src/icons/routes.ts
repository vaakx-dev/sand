import type { Peers } from '@sand/devices-contract'
import type { RouteHandler, Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { LocalCopies } from '../local/copies'
import { projectIconFile, projectIconFileRoute } from './files'
import { isIconHash, projectIconPath } from './paths'

const notFound = () => new Response('not found', { status: 404 })

const iconRoute =
  (home: string, local: LocalCopies, peers: () => Peers | undefined): RouteHandler =>
  async request => {
    const project = new URL(request.url).searchParams.get('project')
    const icon = local.projects().find(found => found.id === project)?.iconFile
    const file = icon && (await projectIconFile(home, icon.hash, peers()))
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

export const serveIcons = (server: Server, home: string, local: LocalCopies, peers: () => Peers | undefined) =>
  joinDisposers(server.route('/project-icon', iconRoute(home, local, peers)), server.route(projectIconFileRoute, storedRoute(home)))
