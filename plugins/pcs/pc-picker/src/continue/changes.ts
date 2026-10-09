import type { ProjectRef } from '@sand/host-projects/contract'
import type { Machine } from '@sand/web-client/contract'
import { errorMessage } from '@sand/dom'
import { refOf } from '../target'
import type { ContinueContext } from './flow'

const wantsSend = async (ctx: ContinueContext, source: Machine, target: Machine) => {
  if (!ctx.picker) return 'send'
  const picked = await ctx.picker.choose(`${source.name} has changes ${target.name} doesn't have`, [
    { label: `Send them to ${target.name} first`, value: 'send' },
    { label: 'Continue without them', value: 'skip' },
  ])
  return picked?.value
}

export const offerSend = async (ctx: ContinueContext, from: ProjectRef, to: ProjectRef, source: Machine, target: Machine) => {
  const sync = ctx.sync
  if (!sync) return true
  await Promise.allSettled([sync.refresh(refOf(from)), sync.refresh(refOf(to))])
  const relation = sync.relation(refOf(from), refOf(to))
  if (relation !== 'ahead' && relation !== 'both') return true
  const choice = await wantsSend(ctx, source, target)
  if (!choice) return false
  if (choice === 'skip') return true
  ctx.notify?.push(`Sending the changes from ${source.name} to ${target.name}…`)
  try {
    const applied = await sync.send(refOf(from), refOf(to))
    if (applied.result !== 'conflicts') return true
    ctx.syncFlows?.resolve(refOf(to))
    ctx.notify?.push(`Finish merging on ${target.name}, then continue again`)
    return false
  } catch (error) {
    ctx.notify?.push(errorMessage(error), { level: 'error' })
    return false
  }
}
