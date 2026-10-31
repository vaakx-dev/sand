import { isRecord } from '@sand/util'
import { readdir } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

const readManifest = async (dir: string): Promise<Record<string, unknown>> => {
  try {
    const manifest: unknown = await Bun.file(join(dir, 'package.json')).json()
    return isRecord(manifest) ? manifest : {}
  } catch {
    return {}
  }
}

const subfolders = async (dir: string) =>
  (await readdir(dir, { withFileTypes: true }).catch(() => []))
    .filter(entry => (entry.isDirectory() || entry.isSymbolicLink()) && !skipped(entry.name))
    .map(entry => join(dir, entry.name))

const nestedPlugins = async (dir: string): Promise<string[]> => {
  const found = await Promise.all(
    (await subfolders(dir)).map(async child => ((await Bun.file(join(child, 'package.json')).exists()) ? [child] : nestedPlugins(child))),
  )
  return found.flat()
}

const builtinId = async (dir: string) => {
  const { name } = await readManifest(dir)
  return typeof name === 'string' ? name.replace(/^@sand\//, '') : basename(dir)
}

export const builtinPlugins = async (root: string) => {
  const dirs = await nestedPlugins(root)
  const ids = await Promise.all(dirs.map(builtinId))
  return dirs.map((dir, index) => [ids[index]!, dir] as const)
}

export const userPlugins = async (root: string, table: unknown) => {
  const folders = (await subfolders(root)).map(dir => [basename(dir), dir] as const)
  const paths = Object.keys(isRecord(table) ? table : {})
    .filter(id => isAbsolute(id))
    .map(path => [path, path] as const)
  return [...folders, ...paths]
}

const fileIn = (dir: string, table: unknown, key: string) => {
  const file = isRecord(table) ? table[key] : undefined
  return typeof file === 'string' ? resolve(dir, file) : undefined
}

export const entryFor = async (dir: string, place: string) => fileIn(dir, (await readManifest(dir)).sand, place)

export const contractFor = async (dir: string) => fileIn(dir, (await readManifest(dir)).exports, './contract')
