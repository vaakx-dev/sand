import { resolve } from 'node:path'

const imageBytes = 10 * 1024 * 1024
const pageBytes = 25 * 1024 * 1024

const types: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
}

const localImage = /(["'(])((?:\/(?!\/)|\.{1,2}\/|\w)[^"'()\s<>:]*?\.(?:png|jpe?g|gif|webp|avif|svg))(["')])/gi

interface ImageFile {
  path: string
  full: string
  exists: boolean
  size: number
}

const megabytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`

const isAbsolute = (path: string) => path.startsWith('/')

const dataUrl = async (path: string) => {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  const data = Buffer.from(await Bun.file(path).arrayBuffer()).toString('base64')
  return `data:${types[extension]};base64,${data}`
}

const locate = async (path: string, base?: string): Promise<ImageFile | undefined> => {
  if (!isAbsolute(path) && !base) return undefined
  const full = isAbsolute(path) ? path : resolve(base!, path)
  const file = Bun.file(full)
  return { path, full, exists: await file.exists(), size: file.size }
}

export const inlineImages = async (html: string, base?: string) => {
  const paths = [...new Set([...html.matchAll(localImage)].map(match => match[2]!))]
  const files = (await Promise.all(paths.map(path => locate(path, base)))).filter(file => file !== undefined)
  const missing = files.filter(file => isAbsolute(file.path) && !file.exists).map(file => file.path)
  const found = files.filter(file => file.exists)
  if (!found.length) return { html, missing }
  const large = found.find(file => file.size > imageBytes)
  if (large) throw new Error(`${large.full} is larger than ${megabytes(imageBytes)}. Use a smaller image.`)
  if (found.reduce((sum, file) => sum + file.size, 0) > pageBytes) {
    throw new Error(`The page's images add up to more than ${megabytes(pageBytes)}. Use fewer or smaller images.`)
  }
  const urls = new Map(await Promise.all(found.map(async file => [file.path, await dataUrl(file.full)] as const)))
  return { html: html.replace(localImage, (match, open: string, path: string, close: string) => `${open}${urls.get(path) ?? path}${close}`), missing }
}
