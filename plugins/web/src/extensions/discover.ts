import { basename, dirname, join, resolve } from 'node:path'

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

const manifests = new Bun.Glob('*/package.json')

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

const children = async (dir: string) => {
  try {
    const found = await Array.fromAsync(manifests.scan({ cwd: dir, onlyFiles: true }))
    return found.map(path => join(dir, dirname(path))).sort()
  } catch {
    return []
  }
}

export const discover = async (parents: Folder[], extra: Folder[], enabled: Record<string, boolean>) => {
  const listed = await Promise.all(parents.map(async parent => (await children(parent.dir)).map(dir => ({ dir, builtin: parent.builtin }))))
  const candidates = [...listed.flat(), ...extra]
  const read = await Promise.all(candidates.map(candidate => webManifest(candidate.dir)))
  const found = new Map<string, Extension>()
  candidates.forEach(({ dir, builtin }, index) => {
    const manifest = read[index]
    const id = basename(dir)
    if (!manifest || found.has(id)) return
    const { standard, ...rest } = manifest
    found.set(id, { id, dir, ...rest, builtin, enabled: enabled[id] ?? standard })
  })
  return [...found.values()]
}
