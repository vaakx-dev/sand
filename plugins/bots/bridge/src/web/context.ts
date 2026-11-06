import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { projects } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { wire, kit, projects }

export type BridgeWeb = Context<typeof inject>
