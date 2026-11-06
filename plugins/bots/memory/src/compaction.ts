import type { CompactionBrief } from '@sand/compaction/contract'
import { type BotMemory, memoryLimit } from './contract'

const sections = ['The user', 'Preferences and rules', 'Decisions', 'People']

const current = (text: string) =>
  text
    ? `Your memory now, ${text.length} of ${memoryLimit} characters. The user may have edited it since you last saw it; their edits stand:\n\n<current-memory>\n${text}\n</current-memory>`
    : 'Your memory is empty so far.'

const format = (memory: string) => `Reply with exactly two parts, each in its tags, and nothing else.

The summary is your short-term memory: what the current work needs to carry on from here. If there is an earlier summary, keep what the current work still needs, add what's new, and drop work that is now finished, kept promises and anything the user moved on from. Leave out any section with nothing in it.

<summary>
## Working on
- [What you're doing for the user now, and how far it got]

## Next steps
1. [What happens next, in order, including anything you promised and haven't done yet]

## Context
- [Findings, data and references the current work needs]
</summary>

Leave out finished work. If later work needs a result of it, like a date, a number or a link, keep just that result under Context.

The memory is your long-term memory, rewritten whole from your memory now and everything above. It lasts for months, so only the most important things go in:
- Keep what is still true. Fix what changed, and drop what is stale or no longer true.
- Add what is new and important. The test for each point: would you get something wrong a month from now without it?
- Always keep what the user asked you to remember, until they say otherwise.
- Leave out what belongs in the summary, a log of what you did, and anything your job, files or tools can tell you.
- It must fit in ${memoryLimit} characters. When it's full, make room by tightening wording, merging points or replacing something less important.
- Use these sections, in this order, and leave out empty ones: ${sections.map(section => `## ${section}`).join(', ')}. Write short bullets of plain facts, with dates where they matter. Today is ${new Date().toISOString().slice(0, 10)}.
- If nothing changed, repeat it exactly.

<memory>
[The whole memory]
</memory>

${current(memory)}`

const tagged = (reply: string, tag: string) => reply.match(new RegExp(`<${tag}>([\\s\\S]*)</${tag}>`))?.[1]?.trim()

const problemOf = (reply: string) => {
  const memory = tagged(reply, 'memory')
  if (!tagged(reply, 'summary') || memory === undefined) return 'Reply again with both parts, each in its tags: <summary>…</summary> and <memory>…</memory>.'
  if (memory.length > memoryLimit)
    return `Your memory is ${memory.length} characters, over the ${memoryLimit} limit. Reply again with both parts, and cut the memory to fit: tighten wording, merge points and drop what matters least. Keep everything the user asked you to remember.`
  return undefined
}

export const compactionOf = (memory: BotMemory, bot: string): CompactionBrief => ({
  format: async () => format((await memory.read(bot)).trim()),
  check: problemOf,
  async accept(reply) {
    const summary = tagged(reply, 'summary') ?? reply.replace(/<memory>[\s\S]*<\/memory>/, '').trim()
    if (!summary) throw new Error('Compaction produced an empty summary')
    const kept = tagged(reply, 'memory')
    if (kept !== undefined && kept !== (await memory.read(bot)).trim()) await memory.write(bot, `${kept}\n`)
    return summary
  },
})
