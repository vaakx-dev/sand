import type { SyncFlows } from '../../contract'
import type { FlowContext } from '../types'
import { startAdd, startCopy, startResolve, startSend } from './flows'

export const createSyncFlows = (ctx: FlowContext): SyncFlows => ({
  copy: (group, device, then) => startCopy(ctx, group, device, then),
  add: group => startAdd(ctx, group),
  send: (from, to) => startSend(ctx, from, to),
  resolve: ref => startResolve(ctx, ref),
})
