import type { ProjectGroup, ProjectRef } from '@sand/protocol'
import { errorMessage } from '@sand/dom'
import { deviceOf, type FlowContext } from '../types'
import { syncOf } from './available'
import { destinationPage } from './destination'
import { devicesPage } from './devices'
import { copySource } from './source'
import { openResolve } from './resolve'
import { sendPage } from './sendReview'

export const startCopy = (ctx: FlowContext, group: ProjectGroup, device?: string) => {
  const sync = syncOf(ctx)
  if (!sync) return
  const from = copySource(ctx, group)
  const machine = ctx.machines.get(device)
  if (!from) return ctx.notify?.push(`No PC with ${group.name} is online`, { level: 'error' })
  if (!machine?.online) return ctx.notify?.push('That PC is offline', { level: 'error' })
  ctx.palette?.open(destinationPage(ctx, sync, group.name, from, machine))
}

export const startAdd = (ctx: FlowContext, group: ProjectGroup) => {
  const sync = syncOf(ctx)
  if (!sync) return
  const from = copySource(ctx, group)
  if (!from) return ctx.notify?.push(`No PC with ${group.name} is online`, { level: 'error' })
  ctx.palette?.open(devicesPage(ctx, group, machine => destinationPage(ctx, sync, group.name, from, machine)))
}

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
