import { joinDisposers } from '@sand/kit'
import { isIconHash, projectIconPath } from '@sand/kit/fs'
import { projectIconFile, projectIconFileRoute } from '@sand/kit/host'
import type { ProjectFiles } from '@sand/project-files/contract'
import type { RouteHandler, Server } from '@sand/server/contract'

const notFound = () => new Response('not found', { status: 404 })

const iconRoute =
  (home: string, files: ProjectFiles): RouteHandler =>
  async request => {
    const project = new URL(request.url).searchParams.get('project')
    const icon = files.local().projects.find(found => found.id === project)?.iconFile
    const file = icon && (await projectIconFile(home, icon.hash))
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
  joinDisposers(server.route('/project-icon', iconRoute(home, files)), server.route(projectIconFileRoute, storedRoute(home)))
