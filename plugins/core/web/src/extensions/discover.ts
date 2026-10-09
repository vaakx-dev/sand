import { basename, join, resolve } from 'node:path'
import { pluginFolders } from './folders'

export interface Extension {
  id: string
  dir: string
  entry: string
  builtin: boolean
  enabled: boolean
  provides: string[]
  label?: string
  summary?: string
}

export interface Folder {
  dir: string
  builtin: boolean
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

const webManifest = async (dir: string) => {
  try {
    const sand = (await Bun.file(join(dir, 'package.json')).json())?.sand
    return typeof sand?.web === 'string'
      ? { entry: resolve(dir, sand.web), provides: strings(sand.provides), label: text(sand.label), summary: text(sand.summary), standard: sand.enabled !== false }
      : undefined
  } catch {
    return undefined
  }
}

export const discover = async (parents: Folder[], extra: Folder[], enabled: Record<string, boolean>) => {
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
    const { standard, ...rest } = manifest
    found.set(id, { id, dir, ...rest, builtin, enabled: enabled[id] ?? standard })
  })
  return [...found.values()]
}
