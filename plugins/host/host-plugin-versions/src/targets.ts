import { validPluginName } from '@sand/kit/host'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { VersionKind } from './contract'

export interface TargetInfo {
  key: string
  kind: VersionKind
  name: string
  path: string
  folder: boolean
}

const loopsFile = 'loops.json'

const hookFile = (name: string) => name.endsWith('.ts') && validPluginName(name)

export const targetInfo = (home: string, key: string): TargetInfo | undefined => {
  const [area, name, ...rest] = key.split('/')
  if (!name || rest.length) return undefined
  if (area === 'plugins' && validPluginName(name)) return { key, kind: 'plugin', name, path: join(home, 'plugins', name), folder: true }
  if (area === 'hooks' && hookFile(name)) return { key, kind: 'hook', name, path: join(home, 'hooks', name), folder: false }
  if (area === 'settings' && name === loopsFile) return { key, kind: 'setting', name, path: join(home, loopsFile), folder: false }
  return undefined
}

export const present = (info: TargetInfo) =>
  lstat(info.path).then(
    stats => (info.folder ? stats.isDirectory() : stats.isFile()),
    () => false,
  )

const names = async (folder: string, wanted: (entry: { name: string; isFile(): boolean; isDirectory(): boolean }) => boolean) => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  return entries.filter(wanted).map(entry => entry.name)
}

export const discoverTargets = async (home: string): Promise<TargetInfo[]> => {
  const [plugins, hooks] = await Promise.all([
    names(join(home, 'plugins'), entry => entry.isDirectory() && validPluginName(entry.name)),
    names(join(home, 'hooks'), entry => entry.isFile() && hookFile(entry.name)),
  ])
  const keys = [...plugins.map(name => `plugins/${name}`), ...hooks.map(name => `hooks/${name}`), `settings/${loopsFile}`]
  const infos = keys.map(key => targetInfo(home, key)).filter(info => info !== undefined)
  const found = await Promise.all(infos.map(present))
  return infos.filter((_, index) => found[index])
}
