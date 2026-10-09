import type { ProjectRef, Sync, SyncApplied } from '@sand/protocol'
import type { FlowContext } from '../types'
import { pcName } from './names'
import { openResolve } from './resolve'
import { countOf } from './size'

export const reportSend = async (ctx: FlowContext, sync: Sync, from: ProjectRef, to: ProjectRef, applied: SyncApplied) => {
  if (applied.result === 'conflicts') return openResolve(ctx, sync, to)
  if (applied.result === 'current') return ctx.notify?.push('Already up to date')
  ctx.notify?.push(`${countOf(applied.changed, 'file')} updated on ${pcName(ctx, to.device)}`)
  await Promise.all([sync.refresh(to), sync.refresh(from)]).catch(() => undefined)
}
