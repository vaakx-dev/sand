import type { Sync } from '../../contract'
import type { FlowContext } from '../types'
import { completed } from './completed'
import { pcName } from './names'
import type { CopyPlan } from './plan'
import { progressText } from './progress'
import { reportSend } from './result'

const linkAndSend = async (ctx: FlowContext, sync: Sync, plan: CopyPlan, progress: (text: string) => void) => {
  const { from, to } = plan
  progress('Adding the copy')
  await ctx.projects.add(to.path, to.device, plan.project)
  const applied = await sync.send(from, to, update => progress(progressText(update)))
  if (applied.result === 'conflicts') {
    if (plan.done) ctx.notify?.push(`Finish the merge on ${pcName(ctx, to.device)}, then continue the thread again`)
    return reportSend(ctx, sync, from, to, applied)
  }
  await completed(ctx, plan.name, to, plan.done)
}

export const runCopy = async (ctx: FlowContext, sync: Sync, plan: CopyPlan, progress: (text: string) => void) => {
  if (plan.existing > 0) return linkAndSend(ctx, sync, plan, progress)
  const { from, to } = plan
  if (plan.create) await ctx.projects.mkdir(to.path, to.device)
  await sync.copy(from, to, { setup: plan.inspect.setup, project: plan.project }, update => progress(progressText(update)))
  await completed(ctx, plan.name, to, plan.done)
}
