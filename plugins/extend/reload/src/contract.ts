import { request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface Reload {
  run(): Promise<void>
}

export const pluginReload = service<Reload>('pluginReload')

export const pluginsReload = request('plugins.reload', { input: z.object({}), output: type<void>(), place: 'thread' })
