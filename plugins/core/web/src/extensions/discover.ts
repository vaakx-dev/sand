import { isRecord } from '@sand/util'
import { addonFolders } from '@sand/util/release'
import { basename, join, resolve } from 'node:path'
import { pluginFolders } from './folders'

export interface Extension {
  id: string
  dir: string
  entry: string
  modules: Record<string, string>
  builtin: boolean
  addon?: string
  label?: string
  summary?: string
}

export interface Folder {
  dir: string
  builtin: boolean
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const modulesOf = (dir: string, name: unknown, exports: unknown): Record<string, string> =>
  typeof name === 'string' && isRecord(exports)
    ? Object.fromEntries(
        Object.entries(exports)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .map(([path, file]) => [`${name}${path.slice(1)}`, resolve(dir, file)]),
      )
    : {}

const idOf = (dir: string, named: boolean, name: string | undefined) => (named && name ? name.replace(/^@sand\//, '') : basename(dir))

const webManifest = async (dir: string) => {
  try {
    const { name, exports, sand } = (await Bun.file(join(dir, 'package.json')).json()) ?? {}
    return typeof sand?.web === 'string'
      ? {
          name: text(name),
          entry: resolve(dir, sand.web),
          modules: modulesOf(dir, name, exports),
          label: text(sand.label),
          summary: text(sand.summary),
        }
      : undefined
  } catch {
    return undefined
  }
}

interface Candidate extends Folder {
  named: boolean
  addon?: string
}

const addonCandidates = async (folder: string): Promise<Candidate[]> =>
  (await pluginFolders(folder, true)).map(found => ({ dir: found, builtin: false, named: true, addon: basename(folder) }))

const candidatesIn = async ({ dir, builtin }: Folder, build: string): Promise<Candidate[]> => {
  const own = (await pluginFolders(dir, builtin)).map(found => ({ dir: found, builtin, named: builtin }))
  if (builtin) return own
  const addons = await Promise.all((await addonFolders(dir, build)).map(addonCandidates))
  return [...own, ...addons.flat()]
}

export const discover = async (parents: Folder[], extra: Folder[], build: string) => {
  const listed = await Promise.all(parents.map(parent => candidatesIn(parent, build)))
  const all: Candidate[] = [...listed.flat(), ...extra.map(folder => ({ ...folder, named: false }))]
  const candidates = [...all.filter(candidate => !candidate.builtin), ...all.filter(candidate => candidate.builtin)]
  const read = await Promise.all(candidates.map(candidate => webManifest(candidate.dir)))
  const found = new Map<string, Extension>()
  candidates.forEach(({ dir, builtin, named, addon }, index) => {
    const manifest = read[index]
    if (!manifest) return
    const { name, ...rest } = manifest
    const id = idOf(dir, named, name)
    if (!found.has(id)) found.set(id, { id, dir, ...rest, builtin, ...(addon && { addon }) })
  })
  return [...found.values()]
}
