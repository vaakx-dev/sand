import { sessions } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { helloSkills, skillsList, type Skill, type Skills, type SkillSummary } from './contract'

const summaries = (list: Skill[]): SkillSummary[] => list.map(({ name, description }) => ({ name, description }))

export const serveSkills = (ctx: Context, skills: Skills) =>
  ctx.watch(server, found =>
    found
      ? joinDisposers(
          found.hello(helloSkills, async () => summaries(await skills.list())),
          found.handle(skillsList, async ({ session, cwd }) => {
            const thread = session ? ctx.get(sessions)?.open(session) : undefined
            return summaries(await skills.list(session ? thread?.cwd : cwd, thread?.project))
          }),
        )
      : undefined,
  )
