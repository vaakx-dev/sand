import { pcs, wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import type { Context } from 'drydock'

export const inject = { kit, pcs, wire }

export type UiContext = Context<typeof inject>
