import { copyPlugin, validPluginName } from '@sand/kit/host'
import type { BuildInfo } from '@sand/protocol'
import { lstat, rename, rm, rmdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { builtinPlugins } from './builtins'
import { linkDependencies, unlinkDependencies } from './links'
import { writeCustomised } from './manifest'
import type { KeptStore } from './store'
import { basesRoot, builtinHash, type LibraryPaths, pluginsRoot } from './view'

export interface ActionOptions {
  paths: () => LibraryPaths
  kept: KeptStore
  build: () => Promise<BuildInfo>
}

const appVersion = async (appRoot: string) => {
  const data: unknown = await Bun.file(join(appRoot, 'apps', 'sand', 'package.json')).json().catch(() => undefined)
  const version = data && typeof data === 'object' ? (data as { version?: unknown }).version : undefined
  return typeof version === 'string' ? version : ''
}

const exists = (path: string) => lstat(path).then(() => true, () => false)

export const libraryActions = ({ paths, kept, build }: ActionOptions) => {
  const builtinOf = async (name: string) => {
    if (!validPluginName(name)) throw new Error('plugin must be a plugin folder name')
    const found = (await builtinPlugins(paths().appRoot)).get(name)
    if (!found) throw new Error(`${name} is not a built-in plugin`)
    return found
  }

  return {
    async customise(name: string) {
      const builtin = await builtinOf(name)
      const { home, appRoot } = paths()
      const copy = join(pluginsRoot(home), name)
      if (await exists(copy)) throw new Error(`${name} is already in ~/.sand/plugins`)
      const [hash, version, info] = await Promise.all([builtinHash(builtin), appVersion(appRoot), build()])
      await copyPlugin(builtin.folder, join(basesRoot(home), name))
      const staging = join(pluginsRoot(home), `.${name}.customise`)
      try {
        await copyPlugin(builtin.folder, staging)
        await writeCustomised(staging, { version, build: info.id, hash, time: Date.now() })
        await linkDependencies(appRoot, builtin.folder, staging)
        await rename(staging, copy)
      } catch (error) {
        await unlinkDependencies(staging).catch(() => {})
        await rm(staging, { recursive: true, force: true })
        throw error
      }
      await kept.forget(name)
    },
    async keep(name: string) {
      await kept.keep(name, await builtinHash(await builtinOf(name)))
    },
    async restore(name: string) {
      await builtinOf(name)
      const { home } = paths()
      const copy = join(pluginsRoot(home), name)
      const info = await lstat(copy).catch(() => undefined)
      if (info?.isSymbolicLink()) await unlink(copy).catch(() => rmdir(copy))
      else if (info) {
        await unlinkDependencies(copy)
        await rm(copy, { recursive: true, force: true })
      }
      await rm(join(basesRoot(home), name), { recursive: true, force: true })
      await kept.forget(name)
    },
    async relink() {
      const { home, appRoot } = paths()
      for (const builtin of (await builtinPlugins(appRoot)).values()) {
        const copy = join(pluginsRoot(home), builtin.name)
        if ((await lstat(copy).catch(() => undefined))?.isDirectory()) await linkDependencies(appRoot, builtin.folder, copy).catch(() => {})
      }
    },
  }
}
