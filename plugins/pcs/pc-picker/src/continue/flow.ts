import type { ProjectRef } from '@sand/host-projects/contract'
import type { Machine, ProjectGroup, Thread } from '@sand/web-client/contract'
import { errorMessage } from '@sand/dom'
import type { Context } from 'drydock'
import { copyOn } from '../group'
import { offerSend } from './changes'
import { ensureCopy } from './ensure'
import { moveThread, type MoveOptions } from './move'
import { foldersFor, planDestination } from './place'

export type ContinueContext = Context<'threads' | 'machines' | 'wire' | 'projects'>

export const continueTargets = (ctx: ContinueContext, thread: Thread) => {
  const source = ctx.machines.get(thread.device)
  return ctx.machines.list().filter(machine => machine.id !== source?.id)
}

export const blockedReason = (thread?: Thread) => {
  if (!thread) return 'Open a thread first'
  if (thread.info.messages === 0 && thread.entries.size === 0) return 'This thread has no messages yet'
  if (thread.info.kind === 'agent') return "Agent threads can't be continued on another PC"
  if (thread.running) return 'Wait for the current turn to finish'
  return undefined
}

const refusal = (thread: Thread, target: Machine, source?: Machine) => {
  const blocked = blockedReason(thread)
  if (blocked) return blocked
  if (!source) return 'The PC this thread runs on is not paired'
  if (source.id === target.id) return `This thread already runs on ${target.name}`
  if (!target.online) return `${target.name} is offline`
  return undefined
}

const askFolder = (ctx: ContinueContext, target: Machine) => async (missing: string) => {
  if (ctx.picker) return ctx.picker.input(`Folder for this thread on ${target.name}`, missing)
  ctx.notify?.push(`${missing} doesn't exist on ${target.name}`, { level: 'error' })
  return undefined
}

const move = async (ctx: ContinueContext, thread: Thread, source: Machine, target: Machine, folders: string[], options?: MoveOptions) => {
  ctx.notify?.push(`Moving this thread to ${target.name}…`)
  const moved = await moveThread(ctx.wire, thread, source, target, folders, options)
  if (!moved) return
  await ctx.threads.select(moved.session)
  ctx.notify?.push(`Continued on ${target.name}`)
  if (!moved.linked) ctx.notify?.push(`Couldn't mark the original thread on ${source.name}`, { level: 'error' })
}

const fail = (ctx: ContinueContext) => (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

const checked = (ctx: ContinueContext, thread: Thread, target: Machine) => {
  const source = ctx.machines.get(thread.device)
  const refused = refusal(thread, target, source)
  if (refused || !source) {
    ctx.notify?.push(refused ?? 'Could not continue this thread')
    return undefined
  }
  return source
}

const intoCopy = async (ctx: ContinueContext, thread: Thread, source: Machine, target: Machine, group: ProjectGroup, to: ProjectRef) => {
  const from = copyOn(group, thread.device)
  if (from && !(await offerSend(ctx, from, to, source, target))) return
  return move(ctx, thread, source, target, foldersFor(ctx, thread.info.cwd, to, from), { project: group.id })
}

const afterCopy = (ctx: ContinueContext, thread: Thread, target: Machine, group: ProjectGroup) => (to: ProjectRef) => {
  const current = ctx.threads.get(thread.id) ?? thread
  const machine = ctx.machines.get(target.id) ?? target
  const source = checked(ctx, current, machine)
  if (!source) return
  intoCopy(ctx, current, source, machine, group, to).catch(fail(ctx))
}

const moveTo = async (ctx: ContinueContext, thread: Thread, source: Machine, target: Machine) => {
  const plan = planDestination(ctx, thread, target)
  if (plan.kind === 'scratch') return move(ctx, thread, source, target, [])
  if (plan.kind === 'copy') {
    if (plan.from && !(await offerSend(ctx, plan.from, plan.to, source, target))) return
    return move(ctx, thread, source, target, plan.folders, { project: plan.project })
  }
  if (plan.kind === 'nocopy' && ensureCopy(ctx, plan.group, target, afterCopy(ctx, thread, target, plan.group))) return
  return move(ctx, thread, source, target, [thread.info.cwd], { ask: askFolder(ctx, target) })
}

export const continueOn = async (ctx: ContinueContext, thread: Thread, target: Machine) => {
  const source = checked(ctx, thread, target)
  if (!source) return
  await moveTo(ctx, thread, source, target).catch(fail(ctx))
}
