import { validPluginName } from '@sand/kit/host'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { syncStore } from './store'

export const sharedPlugins = async (home: string): Promise<string[]> => {
  const entries = await readdir(join(home, 'plugins'), { withFileTypes: true }).catch(() => [])
  const local = (await syncStore(home)).local()
  return entries
    .filter(entry => entry.isDirectory() && validPluginName(entry.name) && !local.has(entry.name))
    .map(entry => entry.name)
    .sort()
}
