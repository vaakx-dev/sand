import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import type { Context } from 'drydock'

export const inject = { kit, wire }

export type CalendarContext = Context<typeof inject>
