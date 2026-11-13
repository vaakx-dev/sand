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
}

const README = 'README.md'

const MEDIA = 'media'

const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)\)/g

const localImage = (path: string) => !/^[a-z]+:/i.test(path) && !path.startsWith('/')

const mediaFolder = (addon: Addon) => `${addon.home.path}/${MEDIA}`

const addonReadme = async (addon: Addon): Promise<Readme> => {
  const file = Bun.file(join(addon.home.dir, README))
  if (!(await file.exists())) return { readme: '', pictures: [] }
  const text = await file.text()
  const local = [...new Set([...text.matchAll(IMAGE)].map(([, , path]) => path!).filter(localImage))]
  const named = new Map(local.map(path => [path, addonPicture(addon.id, basename(path))]))
  const pictures = await Promise.all(local.map(async path => ({ file: named.get(path)!, bytes: await Bun.file(join(addon.home.dir, path)).bytes() })))
  const readme = text.replace(IMAGE, (whole, alt: string, path: string) => (named.has(path) ? `![${alt}](${named.get(path)})` : whole))
  return { readme, pictures }
}

export { addonReadme, mediaFolder, type Picture }
