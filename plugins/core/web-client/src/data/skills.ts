import { helloSkills, type SkillSummary, skillsChange as skillsUpdate, skillsList } from '@sand/skills/contract'
import type { Wire } from '@sand/devices-contract'
import type { Context } from 'drydock'
import { type SkillIndex, skillsChange, threadSelect, type Threads } from '../contract'
import { coalesced } from '../detached'
import { onHomeHello } from '../greeted'

const listInput = (threads: Threads) => {
  const current = threads.current()
  if (current) return { session: current.id }
  const cwd = threads.cwd()
  return cwd ? { cwd } : {}
}

export const createSkillIndex = (ctx: Context, wire: Wire, threads: Threads): SkillIndex => {
  let skills: SkillSummary[] = []
  let asked = 0
  const set = (next: SkillSummary[]) => {
    skills = next
    ctx.emit(skillsChange)
  }
  const refresh = coalesced(ctx, () => {
    const ticket = ++asked
    wire.call(skillsList, listInput(threads)).then(
      next => ticket === asked && set(next),
      () => {},
    )
  })
  onHomeHello(ctx, wire, () => {
    set(wire.hello(helloSkills) ?? [])
    refresh()
  })
  ctx.on(threadSelect, refresh)
  ctx.effect(() => wire.on(skillsUpdate, refresh))
  return { list: () => skills }
}
