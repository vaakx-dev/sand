import type { Skill, Skills, SkillSummary } from '@sand/protocol'
import type { Context } from 'drydock'

const summaries = (list: Skill[]): SkillSummary[] => list.map(({ name, description }) => ({ name, description }))

export const serveSkills = (ctx: Context, skills: Skills) => {
  ctx.on('server.hello', async hello => ({ ...hello, skills: summaries(await skills.list()) }))
  ctx.watch('server', server =>
    server?.handle('skills.list', async ({ session, cwd }) => {
      const thread = session ? ctx.sessions?.open(session) : undefined
      return summaries(await skills.list(session ? thread?.cwd : cwd, thread?.project))
    }),
  )
}
