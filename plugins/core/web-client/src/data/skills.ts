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
  const lists = new Map<string, SkillSummary[]>()
  const refresh = coalesced(ctx, () => {
    const ticket = ++asked
    const input = listInput(threads)
    const key = JSON.stringify(input)
    const known = lists.get(key)
    if (known) return set(known)
    wire.call(skillsList, input).then(
      next => {
        lists.set(key, next)
        if (ticket === asked) set(next)
      },
      () => {},
    )
  })
  const fresh = () => {
    lists.clear()
    refresh()
  }
  const offered = () => wire.hello(helloSkills) !== undefined
  onHomeHello(ctx, wire, () => {
    set(wire.hello(helloSkills) ?? [])
    if (offered()) fresh()
  })
  ctx.on(threadSelect, () => {
    if (offered()) refresh()
  })
  ctx.effect(() => wire.on(skillsUpdate, fresh))
  return { list: () => skills }
}
