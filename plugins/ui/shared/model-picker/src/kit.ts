import type { WireRequest } from '@sand/protocol'
import type {} from '@sand/settings/contract'
import type {} from '@sand/toasts/contract'
import type {} from '@sand/web-client/contract'
import { errorMessage, type Pulse } from '@sand/dom'
import type { Context } from 'drydock'
import type { PcStatus } from './pcs'

export type PickerContext = Context<'models'>

export interface PickerKit {
  ctx: PickerContext
  changes: Pulse
  pcs: PcStatus
}

export const send = (ctx: PickerContext, request: WireRequest) =>
  void ctx.wire?.call(request).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))
