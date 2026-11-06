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
  const refresh = coalesced(ctx, () => {
    const ticket = ++asked
    wire.call(skillsList, listInput(threads)).then(
      next => ticket === asked && set(next),
      () => {},
    )
  })
  const offered = () => wire.hello(helloSkills) !== undefined
  onHomeHello(ctx, wire, () => {
    set(wire.hello(helloSkills) ?? [])
    if (offered()) refresh()
  })
  ctx.on(threadSelect, () => {
    if (offered()) refresh()
  })
  ctx.effect(() => wire.on(skillsUpdate, refresh))
  return { list: () => skills, of }
}
