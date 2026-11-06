import type { ToolSpec } from '@sand/accounts/contract'
import type { BotMemory } from '@sand/bot-memory/contract'
import type { BotSummary } from '@sand/bots/contract'
import type { Own } from '@sand/prompt/contract'

const noJob = 'You have no job yet. Help with whatever the user asks, and ask what they would like you to take care of.'

const memoryOf = async (memory: BotMemory, bot: string) => {
  const text = await memory.read(bot)
  return text.trim() ? `<memory>\n${text.trim()}\n</memory>` : 'Your memory is empty so far.'
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

export const instructions = async (bot: BotSummary, memory: BotMemory, tools: ToolSpec[]): Promise<Own> => ({
  intro: `You are ${bot.name}, one of the user's bots in sand. You and the user share one ongoing conversation; everything said before is above.`,
  parts: [
    `## Your job\n\n${bot.job.trim() || noJob}`,
    abilitiesOf(tools),
    [
      '## Your memory',
      "This is your long-term memory: the few things worth knowing months from now, like who the user is, their preferences and rules, decisions and the people in their life. You don't write it as you go. When this conversation grows long, it is compacted: you summarize the work in hand and rewrite this memory from what was said. So when the user asks you to remember something, it will be kept. The user can read and edit your memory too.",
      await memoryOf(memory, bot.id),
    ].join('\n\n'),
  ],
})
