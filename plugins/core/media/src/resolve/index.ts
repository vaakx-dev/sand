import { expandHome } from '@sand/util/fs'
import { stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const imageTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

const largest = 64 * 1024 * 1024

const isNetwork = (path: string) => /^[\\/]{2}/.test(path)

const decoded = (src: string) => {
  try {
    return decodeURIComponent(src)
  } catch {
    return src
  }
}

const fromMsys = (path: string) => {
  if (process.platform !== 'win32') return path
  const drive = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(path)
  if (drive) return `${drive[1]!.toUpperCase()}:/${drive[2] ?? ''}`
  if (path === '/tmp' || path.startsWith('/tmp/')) return join(tmpdir(), path.slice(4))
  return path
}

const located = (src: string, cwd: string | undefined) => {
  const path = fromMsys(src.startsWith('file:') ? fileURLToPath(src) : src)
  if (!cwd && !isAbsolute(path) && !path.startsWith('~')) throw new Error(`${src} is a relative path and the thread has no folder`)
  const absolute = expandHome(path, cwd)
  if (isNetwork(absolute)) throw new Error('Images on network paths are not shown')
  return absolute
}

const existing = async (src: string, cwd: string | undefined) => {
  for (const candidate of new Set([src, decoded(src)])) {
    const path = located(candidate, cwd)
    const info = await stat(path).catch(() => undefined)
    if (info?.isFile()) return { path, size: info.size }
  }
  throw new Error(`There is no image at ${src}`)
}

interface LocalImage {
  path: string
  mediaType: string
}

export const localImage = async (src: string, cwd: string | undefined): Promise<LocalImage> => {
  const found = await existing(src, cwd)
  const mediaType = imageTypes[extname(found.path).toLowerCase()]
  if (!mediaType) throw new Error(`${src} is not an image file`)
  if (found.size > largest) throw new Error(`${src} is too large to show`)
  return { path: found.path, mediaType }
}
