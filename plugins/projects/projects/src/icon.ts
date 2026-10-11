import { joinDisposers } from '@sand/kit'
import type { ProjectFiles } from '@sand/project-files/contract'
import type { RouteHandler, Server } from '@sand/server/contract'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

const types: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ico: 'image/x-icon',
}

const find = async (files: ProjectFiles, project: string) => {
  const copy = project ? files.copies().find(copy => copy.project === project)?.path : undefined
  if (!copy) return undefined
  for (const [extension, type] of Object.entries(types)) {
    const path = join(copy, '.sand', `icon.${extension}`)
    const found = await stat(path).catch(() => undefined)
    if (found?.isFile()) return { path, type, version: Math.round(found.mtimeMs) }
  }
  return undefined
}

const iconRoute =
  (files: ProjectFiles): RouteHandler =>
  async request => {
    const icon = await find(files, new URL(request.url).searchParams.get('project') ?? '')
    if (!icon) return new Response('not found', { status: 404 })
    return new Response(Bun.file(icon.path), {
      headers: {
        'content-type': icon.type,
        'cache-control': 'max-age=31536000, immutable',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
        'x-content-type-options': 'nosniff',
      },
    })
  }

export const serveIcons = (server: Server, files: ProjectFiles) =>
  joinDisposers(
    server.handle('projects.icon', async ({ project }) => (await find(files, project))?.version ?? null),
    server.route('/project-icon', iconRoute(files)),
  )
