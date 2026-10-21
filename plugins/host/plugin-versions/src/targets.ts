import { validPluginName } from '@sand/host-plugin-library/files'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface TargetInfo {
  key: string
  name: string
  path: string
}

export const targetInfo = (home: string, key: string): TargetInfo | undefined => {
  const [area, name, ...rest] = key.split('/')
  if (area !== 'plugins' || !name || rest.length || !validPluginName(name)) return undefined
  return { key, name, path: join(home, 'plugins', name) }
}

export const present = (info: TargetInfo) =>
  lstat(info.path).then(
    stats => stats.isDirectory(),
    () => false,
  )

export const discoverTargets = async (home: string): Promise<TargetInfo[]> => {
  const entries = await readdir(join(home, 'plugins'), { withFileTypes: true }).catch(() => [])
  const infos = entries
    .filter(entry => entry.isDirectory() && validPluginName(entry.name))
    .map(entry => targetInfo(home, `plugins/${entry.name}`))
    .filter(info => info !== undefined)
  const found = await Promise.all(infos.map(present))
  return infos.filter((_, index) => found[index])
}
