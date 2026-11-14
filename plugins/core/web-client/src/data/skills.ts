import { helloSkills, type SkillSummary, skillsChange as skillsUpdate, skillsList } from '@sand/skills/contract'
import type { Pcs, Wire } from '@sand/devices-contract'
import type { Context } from 'drydock'
import { type SkillIndex, type SkillPlace, skillsChange, threadSelect, type Threads } from '../contract'
import { coalesced } from '../detached'
import { onHomeHello } from '../greeted'

const listInput = (threads: Threads) => {
  const current = threads.current()
  if (current) return { session: current.id }
  const cwd = threads.cwd()
  return cwd ? { cwd } : {}
}

const homeOf = (pcs: Pcs, place: SkillPlace) => ('bot' in place ? pcs.list().find(pc => pc.home)?.id : undefined)

export const createSkillIndex = (ctx: Context, wire: Wire, pcs: Pcs, threads: Threads): SkillIndex => {
  let skills: SkillSummary[] = []
  let asked = 0
  const places = new Map<string, Promise<SkillSummary[]>>()
  const set = (next: SkillSummary[]) => {
    skills = next
    places.clear()
    ctx.emit(skillsChange)
  }
  const of = (place: SkillPlace) => {
    const key = JSON.stringify(place)
    const known = places.get(key)
    if (known) return known
    const asking = wire.call(skillsList, place, homeOf(pcs, place))
    places.set(key, asking)
    asking.catch(() => places.delete(key))
    return asking
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
  return { list: () => skills, of }
}
