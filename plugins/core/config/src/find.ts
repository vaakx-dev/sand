import { addonFolders } from '@sand/util/release'
import { readdir } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { z } from 'zod'

type Table = Record<string, unknown>

const table = z.record(z.string(), z.unknown()).catch({})

export type Found = readonly [id: string, dir: string, addon?: string]

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

const readManifest = async (dir: string): Promise<Table> => {
  try {
    return table.parse(await Bun.file(join(dir, 'package.json')).json())
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

export const builtinPlugins = async (root: string): Promise<Found[]> => {
  const dirs = await nestedPlugins(root)
  const ids = await Promise.all(dirs.map(builtinId))
  return dirs.map((dir, index) => [ids[index]!, dir])
}

const pluginsOfAddon = async (folder: string): Promise<Found[]> => (await builtinPlugins(folder)).map(([id, dir]) => [id, dir, basename(folder)])

export const addonPlugins = async (root: string, build: string) => (await Promise.all((await addonFolders(root, build)).map(pluginsOfAddon))).flat()

const ownPlugins = async (root: string): Promise<Found[]> => {
  const folders = await subfolders(root)
  const plugins = await Promise.all(folders.map(dir => Bun.file(join(dir, 'package.json')).exists()))
  return folders.filter((_, index) => plugins[index]).map(dir => [basename(dir), dir])
}

export const userPlugins = async (root: string, plugins: unknown, build: string): Promise<Found[]> => {
  const paths = Object.keys(table.parse(plugins))
    .filter(id => isAbsolute(id))
    .map((path): Found => [path, path])
  return [...(await ownPlugins(root)), ...(await addonPlugins(root, build)), ...paths]
}

const fileIn = (dir: string, files: unknown, key: string) => {
  const file = table.parse(files)[key]
  return typeof file === 'string' ? resolve(dir, file) : undefined
}

export const sandOf = async (dir: string): Promise<Table> => {
  const { sand } = await readManifest(dir)
  return table.parse(sand)
}

export const entryIn = (dir: string, sand: Table, place: string) => fileIn(dir, sand, place)

export const runsNowhere = (sand: Table) => !['host', 'runtime', 'print', 'cli', 'web'].some(place => typeof sand[place] === 'string')

export const contractFor = async (dir: string) => fileIn(dir, (await readManifest(dir)).exports, './contract')
