import type { ToolSpec } from '@sand/accounts/contract'
import type { BotMemory } from '@sand/bot-memory/contract'
import type { BotSummary } from '@sand/bots/contract'

const noJob = 'You have no job yet. Help with whatever the user asks, and ask what they would like you to take care of.'

const memoryOf = async (memory: BotMemory, bot: string) => {
  const files = await memory.list(bot)
  if (!files.length) return 'Your memory is empty so far.'
  const texts = await Promise.all(files.map(file => memory.read(bot, file.name)))
  return files.map((file, index) => `<memory file="${file.name}">\n${texts[index]!.trim()}\n</memory>`).join('\n\n')
}

const firstSentence = (text: string) => text.trim().split(/(?<=[.!?])\s/)[0]

const abilitiesOf = (tools: ToolSpec[]) =>
  [
    '## What you can do',
    tools.length
      ? `Besides talking with the user, you can act only through these tools:\n\n${tools.map(tool => `- ${tool.name}: ${firstSentence(tool.description)}`).join('\n')}`
      : 'You have no tools: you can only talk with the user.',
    'You can do nothing else. You act only while you are answering, unless one of your tools sets up something that happens later. Never say you will do something, or that you did something, that none of your tools can do: say plainly that you cannot, and offer what you can do instead.',
  ].join('\n\n')

export const instructions = async (bot: BotSummary, memory: BotMemory, tools: ToolSpec[]) =>
  [
    `You are ${bot.name}, one of the user's bots in sand. You and the user share one ongoing conversation; everything said before is above. Each message to you starts with the time it reached you, in <time> tags.`,
    `## Your job\n\n${bot.job.trim() || noJob}`,
    abilitiesOf(tools),
    [
      '## Your memory',
      'Your memory is a set of Markdown files that last across the whole conversation, and the user can read and edit them.',
      'When you learn something worth keeping (preferences, people, plans, decisions, open tasks), save it with memory_write: one topic per file, rewriting the whole file.',
      await memoryOf(memory, bot.id),
    ].join('\n\n'),
  ].join('\n\n')
