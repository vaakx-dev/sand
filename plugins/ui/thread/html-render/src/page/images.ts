import { bytes } from '@sand/kit'
import { isAbsolute, resolve } from 'node:path'

const imageBytes = 10 * 1024 * 1024
const pageBytes = 25 * 1024 * 1024

const drive = process.platform === 'win32' ? String.raw`[A-Za-z]:[\\/]|` : ''

const localImage = new RegExp(String.raw`(["'(])((?:${drive}\/(?!\/)|\.{1,2}\/|\w)[^"'()\s<>:]*?\.(?:png|jpe?g|gif|webp|avif|svg))(["')])`, 'gi')

interface ImageFile {
  path: string
  full: string
  exists: boolean
  size: number
}

const locate = async (path: string, base: string): Promise<ImageFile> => {
  const full = isAbsolute(path) ? path : resolve(base, path)
  const file = Bun.file(full)
  return { path, full, exists: await file.exists(), size: file.size }
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

export const inlineImages = async (html: string, base: string) => {
  const paths = [...new Set([...html.matchAll(localImage)].map(match => match[2]!))]
  const files = await Promise.all(paths.map(path => locate(path, base)))
  const missing = files.filter(file => isAbsolute(file.path) && !file.exists).map(file => file.path)
  const found = files.filter(file => file.exists)
  if (!found.length) return { html, missing }
  checkSizes(found)
  const urls = new Map(await Promise.all(found.map(async file => [file.path, await dataUrl(file.full)] as const)))
  return { html: html.replace(localImage, (_, open: string, path: string, close: string) => `${open}${urls.get(path) ?? path}${close}`), missing }
}
