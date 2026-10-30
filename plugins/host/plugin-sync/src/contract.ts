import { request, type, wireEvent } from '@sand/host-hub/contract'
import { pluginName } from '@sand/host-plugin-library/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface PluginTree {
  hash: string
  files: Record<string, string>
}

export interface PluginManifest {
  device: string
  plugins: Record<string, PluginTree>
  local: string[]
}

export type PluginChangeKind = 'changed' | 'new' | 'removed'

export interface PluginOffer {
  peer: string
  peerName: string
  plugin: string
  kind: PluginChangeKind
  hash: string
  files: number
  both: boolean
}

export interface InstalledPlugin {
  name: string
  files: number
  local: boolean
}

export interface PluginSyncState {
  plugins: InstalledPlugin[]
  offers: PluginOffer[]
}

export interface PluginFile {
  path: string
  data: string
  executable: boolean
}

export interface PluginFiles {
  plugin: string
  hash: string
  files: PluginFile[]
}

export interface HostPluginSync {
  shared(): Promise<string[]>
}

export const hostPluginSync = service<HostPluginSync>('hostPluginSync')

const choice = z.object({ peer: z.string().min(1), plugins: z.array(pluginName).min(1) })

export const pluginsState = request('plugins.state', { input: z.object({}), output: type<PluginSyncState>() })
export const pluginsApply = request('plugins.apply', { input: choice, output: type<PluginSyncState>() })
export const pluginsSkip = request('plugins.skip', { input: choice, output: type<PluginSyncState>() })
export const pluginsLocal = request('plugins.local', { input: z.object({ plugin: pluginName, local: z.boolean() }), output: type<PluginSyncState>() })
export const pluginsExchange = request('plugins.exchange', { input: z.object({ manifest: z.unknown() }), output: type<unknown>(), callers: 'pc' })
export const pluginsFiles = request('plugins.files', { input: z.object({ plugin: pluginName }), output: type<unknown>(), callers: 'pc' })

export const pluginsChange = wireEvent<PluginSyncState>('plugins.change')
