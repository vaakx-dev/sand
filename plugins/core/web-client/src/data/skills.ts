import type { WireRequest } from '@sand/protocol'
import type { SkillSummary } from '@sand/skills/contract'
import type { SkillIndex, Threads, Wire } from '../contract'
import type { Context } from 'drydock'

const listRequest = (threads: Threads): WireRequest => {
  const current = threads.current()
  if (current) return { type: 'skills.list', session: current.id }
  const cwd = threads.cwd()
  return cwd ? { type: 'skills.list', cwd } : { type: 'skills.list' }
}

export const createSkillIndex = (ctx: Context, wire: Wire, threads: Threads): SkillIndex => {
  let skills: SkillSummary[] = []
  let sequence = 0
  let queued = false
  const set = (next: SkillSummary[]) => {
    skills = next
    ctx.emit('skills.change')
  }
  const ask = () => {
    queued = false
    const ticket = ++sequence
    wire.call<SkillSummary[]>(listRequest(threads)).then(
      next => ticket === sequence && set(next),
      () => {},
    )
  }
  const refresh = () => {
    if (queued) return
    queued = true
    queueMicrotask(ask)
  }
  ctx.on('wire.hello', hello => {
    set(hello.skills)
    refresh()
  })
  ctx.on('thread.select', refresh)
  ctx.on('wire.event', event => {
    if (event.name === 'skills.change') refresh()
  })
  return { list: () => skills }
}
