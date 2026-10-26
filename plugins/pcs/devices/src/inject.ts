import { kit } from '@sand/ui-kit/contract'
import { machines, projects, threads, wire } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { wire, kit, machines, projects, threads }

export type DevicesContext = Context<typeof inject>
export type WireContext = Context<{ wire: typeof wire }>
export type KitContext = Context<{ kit: typeof kit }>
