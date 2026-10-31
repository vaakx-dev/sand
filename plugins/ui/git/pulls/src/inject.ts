import { pcs, wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, pcs, threads, wire }

export type PullsContext = Context<typeof inject>
