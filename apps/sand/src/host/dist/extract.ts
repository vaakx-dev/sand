import type { BuildInfo } from '@sand/protocol'
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { hashApp, readStamp, type BuildStamp } from './build'
import { validVersion } from './bun/home'
import { buildStamp, isAppPath } from './files'
import { hashModules, isLinkEntry, isModulePath, modulesFolder, releaseDamaged, releaseTooOld } from './release/manifest'

type Entries = Map<string, File>

interface Release {
  modules: string
  links: Record<string, string>
}

const readEntries = async (bytes: Uint8Array) => {
  const entries: Entries = await new Bun.Archive(bytes).files()
  for (const name of entries.keys()) {
    if (name !== buildStamp && !isAppPath(name) && !isModulePath(name)) throw new Error(`not a sand bundle: ${name}`)
  }
  if (!entries.has(buildStamp) || !entries.has('package.json')) throw new Error('not a sand bundle: files are missing')
  return entries
}

const parseStamp = async (entries: Entries): Promise<Partial<BuildStamp>> => {
  const stamp = await entries
    .get(buildStamp)!
    .json()
    .catch(() => undefined)
  if (!stamp || typeof stamp !== 'object') throw new Error(releaseDamaged)
  return stamp
}

const isLinkMap = (links: unknown): links is Record<string, string> =>
  !!links && typeof links === 'object' && !Array.isArray(links) && Object.values(links).every(target => typeof target === 'string')

const readRelease = async (entries: Entries): Promise<Release> => {
  const { modules, links, bun } = await parseStamp(entries)
  if (typeof modules !== 'string' || !isLinkMap(links) || typeof bun !== 'string') throw new Error(releaseTooOld)
  if (!validVersion.test(bun)) throw new Error(`not a sand bundle: Bun ${bun}`)
  for (const [link, target] of Object.entries(links)) {
    if (!isLinkEntry(link, target)) throw new Error(`not a sand bundle: link ${link}`)
    for (const name of entries.keys()) {
      if (name === link || name.startsWith(`${link}/`)) throw new Error(`not a sand bundle: ${name} is inside link ${link}`)
    }
  }
  return { modules, links }
}

const newFolder = async (dir: string) => {
  await mkdir(dir, { recursive: true })
  if ((await readdir(dir)).length) throw new Error(`${dir} is not empty`)
}

export const extractBundle = async (bytes: Uint8Array, dir: string): Promise<BuildInfo> => {
  const entries = await readEntries(bytes)
  const release = await readRelease(entries)
  await newFolder(dir)
  for (const [name, file] of entries) await Bun.write(join(dir, ...name.split('/')), file)
  await mkdir(join(dir, modulesFolder), { recursive: true })
  const [stamp, { hash }, modules] = await Promise.all([
    readStamp(dir),
    hashApp(dir),
    hashModules(dir, new Set(Object.keys(release.links))),
  ])
  if (!stamp || stamp.hash !== hash || modules !== release.modules) throw new Error(releaseDamaged)
  return { id: stamp.id, time: stamp.time }
}
