import type {} from '@sand/settings/contract'
import type {} from '@sand/toasts/contract'
import type {} from '@sand/web-client/contract'
import type { Pulse } from '@sand/dom'
import type { Context } from 'drydock'
import type { PcStatus } from './pcs'

export type PickerContext = Context<'models'>

export interface PickerKit {
  ctx: PickerContext
  changes: Pulse
  pcs: PcStatus
}
