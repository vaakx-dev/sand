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

type Request = Parameters<NonNullable<PickerContext['wire']>['call']>[0]

export const send = (ctx: PickerContext, request: Request) =>
  void ctx.wire?.call(request).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))
