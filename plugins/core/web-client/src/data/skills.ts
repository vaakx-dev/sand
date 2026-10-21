import { helloSkills, type SkillSummary, skillsChange as skillsUpdate, skillsList } from '@sand/skills/contract'
import type { Context } from 'drydock'
import { type SkillIndex, skillsChange, threadSelect, type Threads, type Wire, wireHello } from '../contract'
import { coalesced } from '../detached'

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
  ctx.on(wireHello, () => {
    set(wire.hello(helloSkills) ?? [])
    refresh()
  })
  ctx.on(threadSelect, refresh)
  ctx.effect(() => wire.on(skillsUpdate, refresh))
  return { list: () => skills }
}
