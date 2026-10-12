import type { WebCommand } from '@sand/commands/contract'
import type { Machine, Thread } from '@sand/web-client/contract'
import { blockedReason, type ContinueContext, continueOn, continueTargets } from './flow'

const named = (ctx: ContinueContext, name: string) => {
  const wanted = name.toLowerCase()
  const all = ctx.machines.list()
  const found = all.find(machine => machine.id === name || machine.name.toLowerCase() === wanted)
  if (!found) ctx.notify?.push(`No PC named "${name}". The PCs are ${all.map(machine => machine.name).join(', ')}`)
  return found
}

const picked = async (ctx: ContinueContext, thread: Thread): Promise<Machine | undefined> => {
  const candidates = continueTargets(ctx, thread).filter(machine => machine.online)
  if (!candidates.length) {
    ctx.notify?.push('No other PC is online')
    return undefined
  }
  if (ctx.picker) return (await ctx.picker.choose('Continue on', candidates.map(machine => ({ label: machine.name, value: machine }))))?.value
  if (candidates.length === 1) return candidates[0]
  ctx.notify?.push(`Name a PC: /continue ${candidates.map(machine => machine.name).join(' | ')}`)
  return undefined
}

export const continueCommand = (ctx: ContinueContext): WebCommand => ({
  name: 'continue',
  title: 'Continue on another PC',
  description: 'Copy this thread to another PC and keep going there',
  args: '[pc]',
  source: 'local',
  run: async args => {
    const thread = ctx.threads.current()
    const blocked = blockedReason(thread)
    if (!thread || blocked) {
      ctx.notify?.push(blocked ?? 'Open a thread first')
      return
    }
    const name = args.trim()
    const target = name ? named(ctx, name) : await picked(ctx, thread)
    if (target) await continueOn(ctx, thread, target)
  },
})
