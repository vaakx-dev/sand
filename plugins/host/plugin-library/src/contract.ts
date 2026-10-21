import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type PluginOrigin = 'builtin' | 'customised' | 'yours'

export interface PluginCustomised {
  version: string
  build: string
  hash: string
  time: number
}

export interface PluginEntry {
  name: string
  area: string
  origin: PluginOrigin
  label?: string
  description?: string
  folder: string
  from?: PluginCustomised
  changed: boolean
}

export const pluginName = z.string().regex(/^(?!\.)(?!node_modules$)[^/\\:]+$/, 'plugin must be a plugin folder name')

const plugin = z.object({ plugin: pluginName })

export const pluginsLibrary = request('plugins.library', { input: z.object({}), output: type<PluginEntry[]>() })
export const pluginsCustomise = request('plugins.customise', { input: plugin, output: type<PluginEntry[]>() })
export const pluginsKeep = request('plugins.keep', { input: plugin, output: type<PluginEntry[]>() })
export const pluginsRestore = request('plugins.restore', { input: plugin, output: type<PluginEntry[]>() })

export const pluginsLibraryEvent = wireEvent<PluginEntry[]>('plugins.library')
