import { stepTools } from '@sand/turns-contract/contract'
import type { Skills } from './contract'
import type { Context } from 'drydock'
import { describeSkills } from './tool'

export const describePerThread = (ctx: Context, skills: Skills) =>
  ctx.on(stepTools, async (tools, session) => {
    const list = await skills.list(session.cwd, session.project)
    return list.length
      ? tools.map(spec => (spec.name === 'skill' ? { ...spec, description: describeSkills(list) } : spec))
      : tools.filter(spec => spec.name !== 'skill')
  })
