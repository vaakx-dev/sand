import type { CompactionBrief } from '@sand/compaction/contract'
import { type BotMemory, memoryLimit, type Note, noteAbout, noteLimit, noteName } from './contract'

const sections = ['The user', 'Preferences and rules', 'Decisions', 'People']

const currentMemory = (text: string) =>
  text
    ? `Your memory now, ${text.length} of ${memoryLimit} characters. Keep any edits the user made to it:\n\n<current-memory>\n${text}\n</current-memory>`
    : 'Your memory is empty so far.'

const currentNotes = (notes: Note[]) =>
  notes.length
    ? `Your notes now, by name, size and first line. Before you change one, you're shown its text:\n\n<current-notes>\n${notes.map(note => `- ${note.name} (${note.text.trim().length} characters): ${noteAbout(note)}`).join('\n')}\n</current-notes>`
    : 'You have no notes so far.'

const format = (memory: string, notes: Note[]) => `Reply with exactly three parts, each in its tags, and nothing else.

The summary is what the current work needs to carry on from here. If there is an earlier summary, keep what the current work still needs, add what's new, and drop work that is now finished, kept promises and anything the user moved on from. Leave out any section with nothing in it.

<summary>
## Working on
- [What you're doing for the user now, and how far it got]

## Next steps
1. [What happens next, in order, including anything you promised and haven't done yet]

## Context
- [Findings, data and references the current work needs]
</summary>

Leave out finished work. If later work needs a result of it, like a date, a number or a link, keep just that result under Context.

Your memory and your notes are your long-term knowledge. They last for months, so only the most important things go in:
- Keep what is still true. Fix what changed, and drop what is stale or no longer true.
- Add what is new and important. The test for each point: would you get something wrong a month from now without it?
- Always keep what the user asked you to remember, until they say otherwise.
- Leave out what belongs in the summary, a log of what you did, and anything your job, files or tools can tell you.
- Write short bullets of plain facts, with dates where they matter. Today is ${new Date().toISOString().slice(0, 10)}.

The memory is what you know about the user. It is in your instructions on every turn, so it stays small. Rewrite it whole from your memory now and everything above:
- Who the user is, their preferences and rules, their decisions and the people they deal with. What you learned about your work goes in the notes.
- It must fit in ${memoryLimit} characters. When it's full, make room by tightening wording, merging points or replacing something less important.
- Use these sections, in this order, and leave out empty ones: ${sections.map(section => `## ${section}`).join(', ')}.
- If nothing changed, repeat it exactly.

<memory>
[The whole memory]
</memory>

The notes are what you know about your own work: how the systems and projects you look after behave, what broke before and why, how to test and check things, and what worked. You look them up when a task needs them, so together they can hold far more than the memory.
- One note per topic, named in lowercase words joined by hyphens, like deploys or test-setup. Add to the note on a topic before starting a new one.
- Its first line says in one sentence what it covers. Each note fits in ${noteLimit} characters.
- Write only the notes that are new or that change, each one whole. Notes you leave out stay as they are. An empty note deletes it.
- If no note changes, leave the notes part empty.

<notes>
<note name="[topic]">
[The whole note]
</note>
</notes>

${currentMemory(memory)}

${currentNotes(notes)}`

const tagged = (reply: string, tag: string) => reply.match(new RegExp(`<${tag}>([\\s\\S]*)</${tag}>`))?.[1]?.trim()

const written = (reply: string): Note[] =>
  [...(tagged(reply, 'notes') ?? '').matchAll(/<note name="([^"]*)">([\s\S]*?)<\/note>/g)].map(([, name = '', text = '']) => ({ name: name.trim(), text: text.trim() }))

const revealed = (notes: Note[]) =>
  `You changed notes you haven't seen. Here they are now; write each one whole, keeping what is still true and any edits the user made:\n\n${notes.map(({ name, text }) => `<current-note name="${name}">\n${text.trim()}\n</current-note>`).join('\n\n')}`

export const compactionOf = (memory: BotMemory, bot: string): CompactionBrief => {
  let known = new Map<string, string>()
  const shown = new Set<string>()

  const unseen = (note: Note) => {
    const before = known.get(note.name)
    return before !== undefined && !shown.has(note.name) && before.trim() !== note.text
  }

  const problemsOf = (reply: string, notes: Note[]) => {
    const kept = tagged(reply, 'memory') ?? ''
    const named = notes.filter(note => !noteName.safeParse(note.name).success)
    const long = notes.filter(note => note.text.length > noteLimit)
    return [
      ...(kept.length > memoryLimit
        ? [`Your memory is ${kept.length} characters, over the ${memoryLimit} limit. Cut it to fit: tighten wording, merge points and drop what matters least. Keep everything the user asked you to remember.`]
        : []),
      ...(named.length ? [`These note names aren't valid: ${named.map(note => note.name || '(empty)').join(', ')}. Use lowercase words joined by hyphens.`] : []),
      ...long.map(note => `The note ${note.name} is ${note.text.length} characters, over the ${noteLimit} limit. Cut it to fit, or split it by topic.`),
    ]
  }

  const saved = (note: Note): Note | undefined => {
    const before = known.get(note.name)?.trim()
    if (!noteName.safeParse(note.name).success || note.text === (before ?? '')) return undefined
    if (before === undefined || shown.has(note.name)) return { name: note.name, text: `${note.text}\n` }
    return note.text ? { name: note.name, text: `${before}\n\n${note.text}\n` } : undefined
  }

  return {
    async format() {
      const [text, notes] = await Promise.all([memory.read(bot), memory.notes(bot)])
      known = new Map(notes.map(note => [note.name, note.text]))
      shown.clear()
      return format(text.trim(), notes)
    },
    check(reply) {
      if (!tagged(reply, 'summary') || tagged(reply, 'memory') === undefined)
        return 'Reply again with all three parts, each in its tags: <summary>…</summary>, <memory>…</memory> and <notes>…</notes>.'
      const notes = written(reply)
      const hidden = notes.filter(unseen).map(({ name }) => ({ name, text: known.get(name) ?? '' }))
      for (const { name } of hidden) shown.add(name)
      const problems = [...problemsOf(reply, notes), ...(hidden.length ? [revealed(hidden)] : [])]
      return problems.length ? [...problems, 'Reply again with all three parts.'].join('\n\n') : undefined
    },
    async accept(reply) {
      const summary = tagged(reply, 'summary') ?? reply.replace(/<memory>[\s\S]*<\/memory>|<notes>[\s\S]*<\/notes>/g, '').trim()
      if (!summary) throw new Error('Compaction produced an empty summary')
      const kept = tagged(reply, 'memory')
      if (kept !== undefined && kept !== (await memory.read(bot)).trim()) await memory.write(bot, `${kept}\n`)
      for (const note of written(reply).flatMap(note => saved(note) ?? [])) await memory.writeNote(bot, note)
      return summary
    },
  }
}
