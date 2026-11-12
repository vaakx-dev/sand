import type { Bots, BotSummary } from '@sand/bots/contract'
import type { ProjectFiles } from '@sand/project/contract'
import type { ContextBuilder } from '@sand/prompt/contract'
import type { Brief } from '@sand/provider-threads/contract'
import { needs, type Tools } from '@sand/tools/contract'
import { instructions } from './instructions'

export const offered = needs.filter(need => need !== 'thread')

const briefOf = ({ name, job, projects }: BotSummary) => `${name}\n${job}\n${projects.join()}`

export const botBrief = (bots: Bots, tools: Tools, context: ContextBuilder, files: () => ProjectFiles | undefined) => {
  const briefed = new Map<string, string>()
  const brief: Brief = {
    async system(conversation, model) {
      const bot = bots.get(conversation.id)
      if (!bot) throw new Error(`No bot ${conversation.id}`)
      briefed.set(bot.id, briefOf(bot))
      return context.system(conversation, model, instructions(bot, files()))
    },
    tools: (conversation, messages) => tools.specs(messages, conversation),
  }
  const stale = (id: string) => {
    const bot = bots.get(id)
    return bot !== undefined && briefed.get(id) !== briefOf(bot)
  }
  return { brief, stale }
}
