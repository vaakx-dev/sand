import type { PluginState } from '@sand/config/contract'
import { request, type } from '@sand/host-hub/contract'
import type { WebExtensionState } from '@sand/web/contract'
import { z } from 'zod'

export interface PluginRow extends PluginState {
  web?: WebExtensionState
}

export interface PluginDetail extends PluginRow {
  stack?: string
  provides: string[]
  hooks: string[]
}

export const pluginsReport = request('plugins.report', { input: () => z.object({}), output: type<PluginRow[]>(), callers: 'any' })
export const pluginsShow = request('plugins.show', { input: () => z.object({ name: z.string().min(1) }), output: type<PluginDetail>(), callers: 'any' })
