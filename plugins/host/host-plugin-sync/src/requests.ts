import type { Hub } from '@sand/host-hub/contract'
import { validPluginName } from '@sand/kit/host'
import type { Dispose } from 'drydock'
import type { PluginSync } from './types'

const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value) throw new Error(`${label} must be a non-empty string`)
  return value
}

const name = (value: unknown): string => {
  if (typeof value !== 'string' || !validPluginName(value)) throw new Error('plugin must be a plugin folder name')
  return value
}

const names = (value: unknown): string[] => {
  if (!Array.isArray(value) || !value.length) throw new Error('plugins must be a non-empty list of names')
  return value.map(name)
}

const flag = (value: unknown): boolean => {
  if (typeof value !== 'boolean') throw new Error('local must be true or false')
  return value
}

export const pluginRequests = (hub: Hub, sync: PluginSync): (() => Dispose)[] => [
  () => hub.handle('plugins.state', () => sync.state()),
  () => hub.handle('plugins.apply', ({ peer, plugins }) => sync.apply(text(peer, 'peer'), names(plugins))),
  () => hub.handle('plugins.skip', ({ peer, plugins }) => sync.skip(text(peer, 'peer'), names(plugins))),
  () => hub.handle('plugins.local', ({ plugin, local }) => sync.setLocal(name(plugin), flag(local))),
  () => hub.handle('plugins.exchange', ({ manifest }) => sync.exchange(manifest)),
  () => hub.handle('plugins.files', ({ plugin }) => sync.files(name(plugin))),
]
