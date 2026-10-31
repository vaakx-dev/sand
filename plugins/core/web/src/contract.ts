import type { PluginOff } from '@sand/config/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service, type Status } from 'drydock'
import { z } from 'zod'

export type ExtensionStatus = 'off' | Status

export interface BrowserState {
  id: string
  status: ExtensionStatus
  error?: string
  missing?: string[]
  inject: string[]
}

export interface WebExtensionState {
  id: string
  dir: string
  label?: string
  summary?: string
  builtin: boolean
  bundled: boolean
  problem?: string
  browser?: BrowserState & { at: number }
  needs?: string[]
}

export interface WebExtensions {
  list(): WebExtensionState[]
}

export const webExtensions = service<WebExtensions>('webExtensions')

const browserState = z.object({
  id: z.string(),
  status: z.enum(['off', 'pending', 'starting', 'active', 'failed', 'disposed']),
  error: z.string().optional(),
  missing: z.array(z.string()).optional(),
  inject: z.array(z.string()),
})

export const webExtensionsReport = request('web.extensions.report', { input: z.object({ states: z.array(browserState) }), output: type<void>() })

export const webPluginsOff = request('web.plugins.off', { input: z.object({}), output: type<PluginOff[]>() })

export const webBuild = wireEvent<string>('web.build')
