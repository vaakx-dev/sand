import type { SkillIndex, SkillSummary, Wire } from '@sand/protocol'
import type { Context } from 'drydock'

export const createSkillIndex = (ctx: Context, wire: Wire): SkillIndex => {
  let skills: SkillSummary[] = []
  const set = (next: SkillSummary[]) => {
    skills = next
    ctx.emit('skills.change')
  }
  ctx.on('wire.hello', hello => set(hello.skills))
  ctx.on('wire.event', event => {
    if (event.name === 'turn.end') void wire.call<SkillSummary[]>({ type: 'skills.list' }).then(set, () => {})
  })
  return { list: () => skills }
}
