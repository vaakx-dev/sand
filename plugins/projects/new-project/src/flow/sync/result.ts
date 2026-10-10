import type { ProjectRef } from '@sand/host-projects/contract'
import { plural } from '@sand/kit'
import type { SyncApplied } from '@sand/sync/contract'
import type { Sync } from '../../contract'
import type { FlowContext } from '../types'
import { openResolve } from './resolve'

export const reportSend = async (ctx: FlowContext, sync: Sync, from: ProjectRef, to: ProjectRef, applied: SyncApplied) => {
  if (applied.result === 'conflicts') return openResolve(ctx, sync, to)
  if (applied.result === 'current') return ctx.notify?.push('Already up to date')
  ctx.notify?.push(`${plural(applied.changed, 'file')} updated on ${ctx.machines.name(to.device)}`)
  await Promise.all([sync.refresh(to), sync.refresh(from)]).catch(() => undefined)
}
