import { kit } from '@sand/ui-kit/contract'
import { wire } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { wire, kit }

export type PluginsContext = Context<typeof inject>

export type WireContext = Context<{ wire: typeof wire }>
