import type { Machine, WebCommand } from '@sand/protocol'
import { blockedReason, type ContinueContext, continueOn, continueTargets } from './flow'

const pickTarget = async (ctx: ContinueContext, candidates: Machine[], args: string) => {
  const named = args.trim().toLowerCase()
  const match = named ? candidates.find(machine => machine.name.toLowerCase() === named) : undefined
  if (match) return match
  if (ctx.picker) {
    const items = candidates.map(machine => ({ label: machine.name, value: machine }))
    const picked = await ctx.picker.choose('Continue on', items, { query: args.trim() })
    return picked?.value
  }
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
    const candidates = continueTargets(ctx, thread).filter(machine => machine.online)
    if (!candidates.length) {
      ctx.notify?.push('No other PC is online')
      return
    }
    const target = await pickTarget(ctx, candidates, args)
    if (target) await continueOn(ctx, thread, target)
  },
})
