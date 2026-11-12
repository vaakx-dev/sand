import { copyPlugin, removeFolder, removePlugin } from '@sand/plugin-files'
import { isRecord } from '@sand/util'
import { exists } from '@sand/util/fs'
import type { BuildInfo } from '@sand/util/release'
import { lstat, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { builtinPlugins } from './builtins'
import { linkDependencies } from './links'
import { writeCustomised } from './manifest'
import type { KeptStore } from './store'
import { builtinHash, type LibraryPaths, pluginsRoot } from './view'

export interface ActionOptions {
  paths: () => LibraryPaths
  kept: KeptStore
  build: () => Promise<BuildInfo>
  report: (error: unknown) => void
}

const appVersion = async (appRoot: string) => {
  const data: unknown = await Bun.file(join(appRoot, 'apps', 'sand', 'package.json')).json().catch(() => undefined)
  const version = isRecord(data) ? data.version : undefined
  return typeof version === 'string' ? version : ''
}

export const libraryActions = ({ paths, kept, build, report }: ActionOptions) => {
  const builtinOf = async (name: string) => {
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
      const staging = join(pluginsRoot(home), `.${name}.customise`)
      try {
        await copyPlugin(builtin.folder, staging)
        await writeCustomised(staging, { version, build: info.id, hash, time: Date.now() })
        await linkDependencies(appRoot, builtin.folder, staging)
        await rename(staging, copy)
      } catch (error) {
        await removeFolder(staging)
        throw error
      }
      await kept.forget(name)
    },
    async keep(name: string) {
      await kept.keep(name, await builtinHash(await builtinOf(name)))
    },
    async restore(name: string) {
      await builtinOf(name)
      await removePlugin(paths().home, name)
      await kept.forget(name)
    },
    async relink() {
      const { home, appRoot } = paths()
      for (const builtin of (await builtinPlugins(appRoot)).values()) {
        const copy = join(pluginsRoot(home), builtin.name)
        const info = await lstat(copy).catch(() => undefined)
        if (info?.isDirectory()) await linkDependencies(appRoot, builtin.folder, copy).catch(report)
      }
    },
  }
}
