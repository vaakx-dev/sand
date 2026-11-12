import { type CompactionBrief, summaryFormat } from '@sand/compaction/contract'
import { type MemoryRef, type MemoryStore, memoryLimit, type Note, noteAbout, noteLimit, noteName } from './contract'

const currentMemory = (text: string) =>
  text ? `Your memory now, ${text.length} of ${memoryLimit} characters:\n\n<current-memory>\n${text}\n</current-memory>` : 'Your memory is empty so far.'

const currentNotes = (notes: Note[]) =>
  notes.length
    ? `Your notes now, by name, size and first line. Before you change one, you're shown its text:\n\n<current-notes>\n${notes.map(note => `- ${note.name} (${note.text.trim().length} characters): ${noteAbout(note)}`).join('\n')}\n</current-notes>`
    : 'You have no notes so far.'

const format = (memory: string, notes: Note[]) => `Reply with exactly three parts, each in its tags, and nothing else.

First the summary. ${summaryFormat}

<summary>
[The summary]
</summary>

Then your memory, which carries what you learn that no tool call can find again over to later conversations and loads into each of them. Write to it what the person asked you to remember, or what is clearly worth remembering. Rewrite it whole, in up to ${memoryLimit} characters; if nothing changed, repeat it exactly.

<memory>
[The whole memory]
</memory>

Then your notes, the part of your memory listed by first line and read when needed. Write only the notes that are new or that change, each one whole, in up to ${noteLimit} characters and named in lowercase words joined by hyphens. Notes you leave out stay as they are, and an empty note deletes it. If no note changes, leave this part empty.

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
  `You changed notes you haven't seen. Here they are now; write each one whole:\n\n${notes.map(({ name, text }) => `<current-note name="${name}">\n${text.trim()}\n</current-note>`).join('\n\n')}`

const memoryCompaction = (store: MemoryStore, ref: MemoryRef): CompactionBrief => {
  let shownMemory = ''
  let known = new Map<string, string>()
  const shown = new Set<string>()

  const unseen = (note: Note) => {
    const before = known.get(note.name)
    return before !== undefined && !shown.has(note.name) && before.trim() !== note.text
  }

  const problemsOf = (reply: string, notes: Note[]) => {
    const kept = tagged(reply, 'memory') ?? ''
    const named = notes.filter(note => !noteName().safeParse(note.name).success)
    const long = notes.filter(note => note.text.length > noteLimit)
    return [
      ...(kept.length > memoryLimit ? [`Your memory is ${kept.length} characters, over the ${memoryLimit} limit. Cut it to fit.`] : []),
      ...(named.length ? [`These note names aren't valid: ${named.map(note => note.name || '(empty)').join(', ')}. Use lowercase words joined by hyphens.`] : []),
      ...long.map(note => `The note ${note.name} is ${note.text.length} characters, over the ${noteLimit} limit. Cut it to fit, or split it.`),
    ]
  }

  const saved = (note: Note): Note | undefined => {
    const before = known.get(note.name)?.trim()
    if (!noteName().safeParse(note.name).success || note.text === (before ?? '')) return undefined
    if (before === undefined || shown.has(note.name)) return { name: note.name, text: `${note.text}\n` }
    return note.text ? { name: note.name, text: `${before}\n\n${note.text}\n` } : undefined
  }

  const keep = async (kept: string | undefined) => {
    const now = (await store.read(ref)).trim()
    if (kept === undefined || kept === now || now !== shownMemory) return
    await store.write(ref, `${kept}\n`)
  }

  return {
    async format() {
      const [text, notes] = await Promise.all([store.read(ref), store.notes(ref)])
      shownMemory = text.trim()
      known = new Map(notes.map(note => [note.name, note.text]))
      shown.clear()
      return format(shownMemory, notes)
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
      await keep(tagged(reply, 'memory'))
      for (const note of written(reply).flatMap(note => saved(note) ?? [])) await store.writeNote(ref, note)
      return summary
    },
  }
}

export { memoryCompaction }
