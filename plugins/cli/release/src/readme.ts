import { addonPicture } from '@sand/util/release'
import { basename, join } from 'node:path'
import type { Addon } from './split'

interface Picture {
  file: string
  bytes: Uint8Array
}

interface Readme {
  readme: string
  pictures: Picture[]
  cover?: Picture
}

const README = 'README.md'

const MEDIA = 'media'

const COVER = 'card.png'

const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)\)/g

const localImage = (path: string) => !/^[a-z]+:/i.test(path) && !path.startsWith('/')

const mediaFolder = (addon: Addon) => `${addon.home.path}/${MEDIA}`

const coverOf = async (addon: Addon): Promise<Picture | undefined> => {
  const file = Bun.file(join(addon.home.dir, MEDIA, COVER))
  return (await file.exists()) ? { file: addonPicture(addon.id, COVER), bytes: await file.bytes() } : undefined
}

const addonReadme = async (addon: Addon): Promise<Readme> => {
  const file = Bun.file(join(addon.home.dir, README))
  const cover = await coverOf(addon)
  if (!(await file.exists())) return { readme: '', pictures: [], ...(cover && { cover }) }
  const text = await file.text()
  const local = [...new Set([...text.matchAll(IMAGE)].map(([, , path]) => path!).filter(localImage))]
  const named = new Map(local.map(path => [path, addonPicture(addon.id, basename(path))]))
  const pictures = await Promise.all(local.map(async path => ({ file: named.get(path)!, bytes: await Bun.file(join(addon.home.dir, path)).bytes() })))
  const readme = text.replace(IMAGE, (whole, alt: string, path: string) => (named.has(path) ? `![${alt}](${named.get(path)})` : whole))
  return { readme, pictures, ...(cover && { cover }) }
}

export { addonReadme, mediaFolder, type Picture }
