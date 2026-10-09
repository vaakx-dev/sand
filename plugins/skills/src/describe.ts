import type { Skills } from '@sand/protocol'
import type { Context } from 'drydock'
import { describeSkills } from './tool'

export const describePerThread = (ctx: Context, skills: Skills) =>
  ctx.on('context.build', async (request, session) => {
    const list = await skills.list(session.cwd, session.project)
    return {
      ...request,
      tools: list.length
        ? request.tools.map(spec => (spec.name === 'skill' ? { ...spec, description: describeSkills(list) } : spec))
        : request.tools.filter(spec => spec.name !== 'skill'),
    }
  })
