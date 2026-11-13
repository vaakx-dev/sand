import { isRecord } from '@sand/util'
import { addonFolders } from '@sand/util/release'
import { readdir } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'

type Table = Record<string, unknown>

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

const readManifest = async (dir: string): Promise<Table> => {
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

export const addonPlugins = async (root: string) => (await Promise.all((await addonFolders(root)).map(builtinPlugins))).flat()

const ownPlugins = async (root: string) => {
  const folders = await subfolders(root)
  const plugins = await Promise.all(folders.map(dir => Bun.file(join(dir, 'package.json')).exists()))
  return folders.filter((_, index) => plugins[index]).map(dir => [basename(dir), dir] as const)
}

export const userPlugins = async (root: string, table: unknown) => {
  const paths = Object.keys(isRecord(table) ? table : {})
    .filter(id => isAbsolute(id))
    .map(path => [path, path] as const)
  return [...(await ownPlugins(root)), ...(await addonPlugins(root)), ...paths]
}

const fileIn = (dir: string, table: unknown, key: string) => {
  const file = isRecord(table) ? table[key] : undefined
  return typeof file === 'string' ? resolve(dir, file) : undefined
}

export const sandOf = async (dir: string): Promise<Table> => {
  const { sand } = await readManifest(dir)
  return isRecord(sand) ? sand : {}
}

export const entryIn = (dir: string, sand: Table, place: string) => fileIn(dir, sand, place)

export const runsNowhere = (sand: Table) => !['host', 'runtime', 'print', 'cli', 'web'].some(place => typeof sand[place] === 'string')

export const contractFor = async (dir: string) => fileIn(dir, (await readManifest(dir)).exports, './contract')
