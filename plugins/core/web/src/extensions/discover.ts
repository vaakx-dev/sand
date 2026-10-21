import { isRecord } from '@sand/util'
import { basename, join, resolve } from 'node:path'
import { pluginFolders } from './folders'

export interface Extension {
  id: string
  dir: string
  entry: string
  modules: Record<string, string>
  builtin: boolean
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

const webManifest = async (dir: string) => {
  try {
    const { name, exports, sand } = (await Bun.file(join(dir, 'package.json')).json()) ?? {}
    return typeof sand?.web === 'string'
      ? {
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

export const discover = async (parents: Folder[], extra: Folder[]) => {
  const listed = await Promise.all(
    parents.map(async parent => (await pluginFolders(parent.dir, parent.builtin)).map(dir => ({ dir, builtin: parent.builtin }))),
  )
  const all = [...listed.flat(), ...extra]
  const candidates = [...all.filter(candidate => !candidate.builtin), ...all.filter(candidate => candidate.builtin)]
  const read = await Promise.all(candidates.map(candidate => webManifest(candidate.dir)))
  const claimed = new Set(candidates.filter(candidate => !candidate.builtin).map(candidate => basename(candidate.dir)))
  const found = new Map<string, Extension>()
  candidates.forEach(({ dir, builtin }, index) => {
    const manifest = read[index]
    const id = basename(dir)
    if (!manifest || found.has(id) || (builtin && claimed.has(id))) return
    found.set(id, { id, dir, ...manifest, builtin })
  })
  return [...found.values()]
}
