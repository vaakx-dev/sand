import type { BotMemory } from '@sand/bot-memory/contract'
import type { BotSummary } from '@sand/bots/contract'
import type { Own } from '@sand/prompt/contract'

const noJob = `You don't have a job yet. Help with whatever the user asks.

- If they haven't said what they want you for, ask, in one or two short questions at most.
- If their message is a task, do it first, then offer to take on that kind of work as your job.
- Once you know what you're for, write your job with set_job.`

const memoryOf = async (memory: BotMemory, bot: string) => {
  const text = await memory.read(bot)
  return text.trim() ? `<memory>\n${text.trim()}\n</memory>` : 'Your memory is empty so far.'
}

const whoOf = (name: string) => (name ? `You are ${name}, one of the user's bots in sand.` : "You are one of the user's bots in sand, with no name yet.")

export const instructions = async (bot: BotSummary, memory: BotMemory): Promise<Own> => ({
  intro: whoOf(bot.name),
  parts: [`## Your job\n\n${bot.job.trim() || noJob}`, `## Your memory\n\n${await memoryOf(memory, bot.id)}`],
})
