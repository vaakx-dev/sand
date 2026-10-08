import type { Sync } from '@sand/protocol'
import type { FlowContext } from '../types'
import { completed } from './completed'
import type { CopyPlan } from './plan'
import { progressText } from './progress'
import { reportSend } from './result'

const linkAndSend = async (ctx: FlowContext, sync: Sync, plan: CopyPlan, progress: (text: string) => void) => {
  const { from, to } = plan
  progress('Linking folders')
  await ctx.projects.link(from, to)
  const applied = await sync.send(from, to, update => progress(progressText(update)))
  if (applied.result === 'conflicts') return reportSend(ctx, sync, from, to, applied)
  await completed(ctx, plan.name, to)
}

export const runCopy = async (ctx: FlowContext, sync: Sync, plan: CopyPlan, progress: (text: string) => void) => {
  if (plan.existing > 0) return linkAndSend(ctx, sync, plan, progress)
  const { from, to } = plan
  if (plan.create) await ctx.projects.mkdir(to.path, to.device)
  await sync.copy(from, to, { setup: plan.inspect.setup }, update => progress(progressText(update)))
  await completed(ctx, plan.name, to)
}
