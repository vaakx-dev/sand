import { bytes } from '@sand/util'
import { isAbsolute, resolve } from 'node:path'

const imageBytes = 10 * 1024 * 1024
const pageBytes = 25 * 1024 * 1024

const drive = process.platform === 'win32' ? String.raw`[A-Za-z]:[\\/]|` : ''
const start = String.raw`(?:file:\/\/\/(?:[A-Za-z]:)?|${drive}\/(?!\/)|\.{1,2}\/|\w)`
const extension = String.raw`\.(?:png|jpe?g|gif|webp|avif|svg)`

const localImage = new RegExp(
  [
    String.raw`"(${start}[^"<>:\n]*?${extension})"`,
    String.raw`'(${start}[^'<>:\n]*?${extension})'`,
    String.raw`\((${start}[^"'()\s<>:]*?${extension})\)`,
  ].join('|'),
  'gi',
)

const fileUrl = /^file:/i

interface ImageFile {
  path: string
  full: string
  relative: boolean
  exists: boolean
  size: number
}

const fullPath = (path: string, base: string) => {
  if (fileUrl.test(path)) return Bun.fileURLToPath(path)
  return isAbsolute(path) ? path : resolve(base, path)
}

const locate = async (path: string, base: string): Promise<ImageFile> => {
  const full = fullPath(path, base)
  const file = Bun.file(full)
  return { path, full, relative: !isAbsolute(path) && !fileUrl.test(path), exists: await file.exists(), size: file.size }
}

const dataUrl = async (path: string) => {
  const file = Bun.file(path)
  return `data:${file.type};base64,${(await file.bytes()).toBase64()}`
}

const checkSizes = (found: ImageFile[]) => {
  const large = found.find(file => file.size > imageBytes)
  if (large) throw new Error(`${large.full} is larger than ${bytes(imageBytes)}. Use a smaller image.`)
  const total = found.reduce((sum, file) => sum + file.size, 0)
  if (total > pageBytes) throw new Error(`The page's images add up to more than ${bytes(pageBytes)}. Use fewer or smaller images.`)
}

const imagePath = (groups: (string | undefined)[]) => (groups[0] ?? groups[1] ?? groups[2])!

export const inlineImages = async (html: string, base: string) => {
  const paths = [...new Set([...html.matchAll(localImage)].map(match => imagePath(match.slice(1))))]
  const files = await Promise.all(paths.map(path => locate(path, base)))
  const missing = files.filter(file => !file.relative && !file.exists).map(file => file.path)
  const found = files.filter(file => file.exists)
  if (!found.length) return { html, missing }
  checkSizes(found)
  const urls = new Map(await Promise.all(found.map(async file => [file.path, await dataUrl(file.full)] as const)))
  return {
    html: html.replace(localImage, (match, ...groups: (string | undefined)[]) => {
      const path = imagePath(groups)
      const url = urls.get(path)
      return url ? match.replace(path, () => url) : match
    }),
    missing,
  }
}
