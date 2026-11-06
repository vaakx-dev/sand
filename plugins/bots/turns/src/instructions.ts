import type { BotMemory } from '@sand/bot-memory/contract'
import type { BotSummary } from '@sand/bots/contract'
import type { Own } from '@sand/prompt/contract'

const memoryOf = async (memory: BotMemory, bot: string) => {
  const text = await memory.read(bot)
  return text.trim() ? `<memory>\n${text.trim()}\n</memory>` : 'Your memory is empty so far.'
}

const jobOf = (bot: BotSummary) => (bot.job.trim() ? [`## Your job\n\n${bot.job.trim()}`] : [])

export const instructions = async (bot: BotSummary, memory: BotMemory): Promise<Own> => ({
  intro: `You are ${bot.name}, one of the user's bots in sand. You and the user share one ongoing conversation; everything said before is above.`,
  parts: [...jobOf(bot), `## Your memory\n\n${await memoryOf(memory, bot.id)}`],
})
