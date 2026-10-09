import type { ProjectRef } from '@sand/host-projects/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { CopyDone } from '../../contract'
import { errorMessage } from '@sand/dom'
import type { FlowContext } from '../types'
import { syncOf } from './available'
import { devicesPage } from './devices'
import { noCopyPage } from './nocopy'
import { openResolve } from './resolve'
import { sendPage } from './sendReview'

export const startCopy = (ctx: FlowContext, group: ProjectGroup, device?: string, then?: CopyDone) => {
  const machine = ctx.machines.get(device)
  if (!machine?.online) return ctx.notify?.push('That PC is offline', { level: 'error' })
  ctx.palette?.open(noCopyPage(ctx, group, machine, then))
}

export const startAdd = (ctx: FlowContext, group: ProjectGroup) => ctx.palette?.open(devicesPage(ctx, group, machine => noCopyPage(ctx, group, machine)))

export const startSend = (ctx: FlowContext, from: ProjectRef, to: ProjectRef) => {
  const sync = syncOf(ctx)
  if (!sync) return
  Promise.all([sync.refresh(from), sync.refresh(to)]).then(
    () => ctx.palette?.open(sendPage(ctx, sync, from, to)),
    error => ctx.notify?.push(errorMessage(error), { level: 'error' }),
  )
}

export const startResolve = (ctx: FlowContext, ref: ProjectRef) => {
  const sync = syncOf(ctx)
  if (sync) openResolve(ctx, sync, ref)
}
