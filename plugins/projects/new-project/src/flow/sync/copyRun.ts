import type { ProjectRef } from '@sand/host-projects/contract'
import type { CopyDone, Sync } from '../../contract'
import { reportError, type ProjectsContext } from '../../context'
import type { CopyPlan } from './plan'
import { progressText, reportSend } from './report'

const completed = async (ctx: ProjectsContext, name: string, to: ProjectRef, then?: CopyDone) => {
  ctx.notify?.push(`${name} is on ${ctx.machines.name(to.device)}`)
  if (then) return void then(to)
  try {
    await ctx.threads.draft(to.path, to.device)
    ctx.composer?.focus()
  } catch (error) {
    reportError(ctx, error)
  }
}

const linkAndSend = async (ctx: ProjectsContext, sync: Sync, plan: CopyPlan, progress: (text: string) => void) => {
  const { from, to } = plan
  progress('Adding the copy')
  await ctx.projects.add(to.path, to.device, plan.project)
  const applied = await sync.send(from, to, update => progress(progressText(update)))
  if (applied.result === 'conflicts') {
    if (plan.done) ctx.notify?.push(`Finish the merge on ${ctx.machines.name(to.device)}, then continue the thread again`)
    return reportSend(ctx, sync, from, to, applied)
  }
  await completed(ctx, plan.name, to, plan.done)
}

export const runCopy = async (ctx: ProjectsContext, sync: Sync, plan: CopyPlan, progress: (text: string) => void) => {
  if (plan.existing > 0) return linkAndSend(ctx, sync, plan, progress)
  const { from, to } = plan
  if (plan.create) await ctx.projects.mkdir(to.path, to.device)
  await sync.copy(from, to, { setup: plan.inspect.setup, project: plan.project }, update => progress(progressText(update)))
  await completed(ctx, plan.name, to, plan.done)
}
