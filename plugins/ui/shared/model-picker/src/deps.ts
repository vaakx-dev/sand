import type {} from '@sand/settings/contract'
import type {} from '@sand/toasts/contract'
import type {} from '@sand/ui-kit/contract'
import type {} from '@sand/web-client/contract'
import type { Pulse } from '@sand/kit/web'
import type { Context } from 'drydock'
import type { PcStatus } from './pcs'

export type PickerContext = Context<'models' | 'kit'>

export interface Picker {
  ctx: PickerContext
  changes: Pulse
  pcs: PcStatus
}
