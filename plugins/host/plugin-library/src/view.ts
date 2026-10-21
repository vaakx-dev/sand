import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { type BuiltinPlugin, builtinPlugins } from './builtins'
import type { PluginEntry } from './contract'
import { scanPlugin, validPluginName } from './files'
import { readManifest } from './manifest'
import type { KeptStore } from './store'

export interface LibraryPaths {
  home: string
  appRoot: string
}

export const pluginsRoot = (home: string) => join(home, 'plugins')

const userPlugins = async (root: string) => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  const names = entries.filter(entry => (entry.isDirectory() || entry.isSymbolicLink()) && validPluginName(entry.name)).map(entry => entry.name)
  const real = await Promise.all(names.map(name => Bun.file(join(root, name, 'package.json')).exists()))
  return names.filter((_, index) => real[index])
}

export const builtinHash = async (builtin: BuiltinPlugin) => (await scanPlugin(builtin.folder)).hash

const userEntry = async (paths: LibraryPaths, kept: KeptStore, name: string, builtin?: BuiltinPlugin): Promise<PluginEntry> => {
  const folder = join(pluginsRoot(paths.home), name)
  const manifest = await readManifest(folder)
  const from = manifest?.from
  const hash = builtin && from ? await builtinHash(builtin) : undefined
  return {
    name,
    area: builtin?.area ?? 'yours',
    origin: builtin ? 'customised' : 'yours',
    label: manifest?.label,
    description: manifest?.description,
    folder,
    from,
    changed: !!hash && hash !== from?.hash && kept.get(name) !== hash,
  }
}

const builtinEntry = async (builtin: BuiltinPlugin): Promise<PluginEntry> => {
  const manifest = await readManifest(builtin.folder)
  return {
    name: builtin.name,
    area: builtin.area,
    origin: 'builtin',
    label: manifest?.label,
    description: manifest?.description,
    folder: builtin.folder,
    changed: false,
  }
}

export const readLibrary = async (paths: LibraryPaths, kept: KeptStore): Promise<PluginEntry[]> => {
  const [builtins, users] = await Promise.all([builtinPlugins(paths.appRoot), userPlugins(pluginsRoot(paths.home))])
  const mine = new Set(users)
  const plugins = await Promise.all([
    ...[...builtins.values()].filter(builtin => !mine.has(builtin.name)).map(builtinEntry),
    ...users.map(name => userEntry(paths, kept, name, builtins.get(name))),
  ])
  return plugins.sort((a, b) => a.name.localeCompare(b.name))
}
