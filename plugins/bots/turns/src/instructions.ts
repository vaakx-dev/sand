import { type BotMemory, noteAbout } from '@sand/bot-memory/contract'
import type { BotSummary } from '@sand/bots/contract'
import type { Own } from '@sand/prompt/contract'
import { oneLine } from '@sand/util'

const aboutLength = 160

const memoryOf = async (memory: BotMemory, bot: string) => {
  const text = await memory.read(bot)
  return text.trim() ? `<memory>\n${text.trim()}\n</memory>` : 'Your memory is empty so far.'
}

const notesOf = async (memory: BotMemory, bot: string) => {
  const notes = await memory.notes(bot)
  if (!notes.length) return 'You have no notes on your work yet.'
  const index = notes.map(note => `- ${note.name}: ${oneLine(noteAbout(note), aboutLength)}`).join('\n')
  return `What you learned about your work, by topic. Look one up with note_read before work it may cover:\n\n${index}`
}

const jobOf = (bot: BotSummary) => (bot.job.trim() ? [`## Your job\n\n${bot.job.trim()}`] : [])

const whoOf = (name: string) => (name ? `You are ${name}, one of the user's bots in sand.` : "You are one of the user's bots in sand, with no name yet.")

export const instructions = async (bot: BotSummary, memory: BotMemory): Promise<Own> => ({
  intro: whoOf(bot.name),
  parts: [...jobOf(bot), `## Your memory\n\n${await memoryOf(memory, bot.id)}`, `## Your notes\n\n${await notesOf(memory, bot.id)}`],
})
