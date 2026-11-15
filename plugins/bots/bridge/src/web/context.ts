import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { wire, kit, shell, threads }

export type BridgeWeb = Context<typeof inject>
