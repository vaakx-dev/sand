import type { Bots, BotSummary } from '@sand/bots/contract'
import type { Session } from '@sand/chats/contract'
import type { ProjectFiles } from '@sand/project/contract'
import { instructions, jobBlock } from './instructions'

const briefOf = ({ name, jobs, projects }: BotSummary) => [name, ...jobs.map(jobBlock), projects.join()].join('\n')

export const botBrief = (bots: Bots, files: () => ProjectFiles | undefined) => {
  const briefed = new Map<string, string>()
  const base = (parts: string[], session: Session) => {
    const bot = session.owner === 'bot' ? bots.get(session.id) : undefined
    if (!bot) return parts
    briefed.set(bot.id, briefOf(bot))
    return instructions(parts, bot, files())
  }
  const stale = (id: string) => {
    const bot = bots.get(id)
    return bot !== undefined && briefed.get(id) !== briefOf(bot)
  }
  return { base, stale, forget: (id: string) => void briefed.delete(id) }
}
