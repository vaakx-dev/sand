import type { BotMemory } from '@sand/bot-memory/contract'
import type { Bots } from '@sand/bots/contract'
import type { ContextBuilder } from '@sand/prompt/contract'
import type { Brief } from '@sand/provider-threads/contract'
import { needs, type Tools } from '@sand/tools/contract'
import { instructions } from './instructions'

export const offered = needs.filter(need => need !== 'thread')

export const botBrief = (bots: Bots, memory: BotMemory, tools: Tools, context: ContextBuilder): Brief => ({
  async system(conversation, model) {
    const bot = bots.get(conversation.id)
    if (!bot) throw new Error(`No bot ${conversation.id}`)
    return context.system(conversation, model, await instructions(bot, memory, tools.specs([], conversation)))
  },
  tools: (conversation, messages) => tools.specs(messages, conversation),
})
