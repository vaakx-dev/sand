import { kit } from '@sand/ui-kit/contract'
import { models } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import type { Context } from 'drydock'
import type { PcStatus } from './pcs'

export const inject = { models, kit }

export type PickerContext = Context<typeof inject>

export interface Picker {
  ctx: PickerContext
  changes: Pulse
  pcs: PcStatus
}
