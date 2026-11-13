import { validPluginName } from '@sand/plugin-files'
import { isAddonFolder } from '@sand/util/release'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { syncStore } from './store'

export const sharedPlugins = async (home: string): Promise<string[]> => {
  const entries = await readdir(join(home, 'plugins'), { withFileTypes: true }).catch(() => [])
  const local = (await syncStore(home)).local()
  const names = entries.filter(entry => entry.isDirectory() && validPluginName(entry.name) && !local.has(entry.name)).map(entry => entry.name)
  const addons = await Promise.all(names.map(name => isAddonFolder(join(home, 'plugins', name))))
  return names.filter((_, index) => !addons[index]).sort()
}
