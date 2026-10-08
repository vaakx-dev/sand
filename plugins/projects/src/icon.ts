import type { RouteHandler } from '@sand/protocol'
import { stat } from 'node:fs/promises'
import { isAbsolute, join, normalize } from 'node:path'

const types: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ico: 'image/x-icon',
}

const find = async (folder: string) => {
  if (!isAbsolute(folder)) return undefined
  for (const extension of Object.keys(types)) {
    const path = join(normalize(folder), '.sand', `icon.${extension}`)
    const found = await stat(path).catch(() => undefined)
    if (found?.isFile()) return { path, type: types[extension]!, version: Math.round(found.mtimeMs) }
  }
  return undefined
}

export const iconVersion = async (folder: string) => (await find(folder))?.version ?? null

export const iconRoute: RouteHandler = async request => {
  const icon = await find(new URL(request.url).searchParams.get('path') ?? '')
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
