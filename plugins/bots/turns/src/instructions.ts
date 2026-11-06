import type { BotMemory } from '@sand/bot-memory/contract'
import type { BotSummary } from '@sand/bots/contract'
import type { Own } from '@sand/prompt/contract'

const noJob = 'You have no job yet. Help with whatever the user asks, and ask what they would like you to take care of.'

const memoryOf = async (memory: BotMemory, bot: string) => {
  const text = await memory.read(bot)
  return text.trim() ? `<memory>\n${text.trim()}\n</memory>` : 'Your memory is empty so far.'
}

export const instructions = async (bot: BotSummary, memory: BotMemory): Promise<Own> => ({
  intro: `You are ${bot.name}, one of the user's bots in sand. You and the user share one ongoing conversation; everything said before is above.`,
  parts: [`## Your job\n\n${bot.job.trim() || noJob}`, `## Your memory\n\n${await memoryOf(memory, bot.id)}`],
})
