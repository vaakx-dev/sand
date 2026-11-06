import { type Conversation, type ConversationRef, engine } from '@sand/engine/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { helloSkills, skillsList, type Skill, type Skills, type SkillSummary } from './contract'

const summaries = (list: Skill[]): SkillSummary[] => list.map(({ name, description }) => ({ name, description }))

const refOf = ({ session, bot }: { session?: string; bot?: string }): ConversationRef | undefined => {
  if (session) return { owner: 'thread', id: session }
  return bot ? { owner: 'bot', id: bot } : undefined
}

export const serveSkills = (ctx: Context, skills: Skills, global: () => Skill[], skillsOf: (conversation: Conversation) => Promise<Skill[]>) =>
  ctx.watch(server, found =>
    found
      ? joinDisposers(
          found.hello(helloSkills, () => summaries(global())),
          found.handle(skillsList, async input => {
            const ref = refOf(input)
            const conversation = ref && ctx.get(engine)?.open(ref)
            return summaries(await (conversation ? skillsOf(conversation) : skills.list(input.cwd)))
          }),
        )
      : undefined,
  )
