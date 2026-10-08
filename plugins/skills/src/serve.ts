import type { Skills, SkillSummary } from '@sand/protocol'
import type { Context } from 'drydock'

export const serveSkills = (ctx: Context, skills: Skills) => {
  const summaries = (): SkillSummary[] => skills.list().map(({ name, description }) => ({ name, description }))
  ctx.on('server.hello', hello => ({ ...hello, skills: summaries() }))
  ctx.watch('server', server => server?.handle('skills.list', summaries))
}
