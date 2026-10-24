import { readFile, stat } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { FileContent } from '../contract'

const maxBytes = 2_000_000
const maxImageBytes = 10_000_000
const sniffBytes = 8000

const imageTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
}

const insideFolder = (cwd: string, path: string) => {
  const full = resolve(cwd, path)
  const rel = relative(cwd, full)
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${path} is outside ${cwd}`)
  return full
}

export const readProjectFile = async (cwd: string, path: string): Promise<FileContent> => {
  const full = insideFolder(cwd, path)
  const { size } = await stat(full)
  const imageType = imageTypes[extname(full).slice(1).toLowerCase()]
  if (size > (imageType ? maxImageBytes : maxBytes)) return { size, skipped: 'large' }
  const bytes = await readFile(full)
  if (imageType) return { size, image: `data:${imageType};base64,${bytes.toString('base64')}` }
  if (bytes.subarray(0, sniffBytes).includes(0)) return { size, skipped: 'binary' }
  return { size, text: bytes.toString('utf8') }
}
