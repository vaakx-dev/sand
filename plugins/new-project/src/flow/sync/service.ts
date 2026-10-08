import type { SyncFlows } from '@sand/protocol'
import type { FlowContext } from '../types'
import { startAdd, startCopy, startResolve, startSend } from './flows'

export const createSyncFlows = (ctx: FlowContext): SyncFlows => ({
  copy: (group, device) => startCopy(ctx, group, device),
  add: group => startAdd(ctx, group),
  send: (from, to) => startSend(ctx, from, to),
  resolve: ref => startResolve(ctx, ref),
})
