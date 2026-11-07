import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { type BotMemory, type Note, noteAbout } from './contract'

const mostFound = 10

const input = z.object({
  query: z.string().min(1).optional().describe('Words to look for; returns the parts of your notes that hold the most of them'),
  note: z.string().min(1).optional().describe('A note name, to read that note whole'),
})

const sectionsOf = ({ name, text }: Note) =>
  text
    .split(/\n(?=#)/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => ({ name, part }))

const search = (notes: Note[], query: string) => {
  const words = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))]
  const scored = notes.flatMap(sectionsOf).map(found => {
    const haystack = `${found.name}\n${found.part}`.toLowerCase()
    return { ...found, score: words.filter(word => haystack.includes(word)).length }
  })
  const best = scored.filter(found => found.score > 0).sort((a, b) => b.score - a.score).slice(0, mostFound)
  return best.length ? best.map(({ name, part }) => `<note name="${name}">\n${part}\n</note>`).join('\n\n') : `No note mentions ${query}.`
}

const listed = (notes: Note[]) => (notes.length ? notes.map(note => `- ${note.name}: ${noteAbout(note)}`).join('\n') : 'You have no notes yet.')

const whole = (notes: Note[], name: string) => {
  const found = notes.find(note => note.name === name)
  if (!found) throw new Error(`No note ${name}. You have: ${notes.map(note => note.name).join(', ') || 'none'}`)
  return found.text.trim()
}

export const noteTool = (memory: BotMemory): Tool<typeof input> => ({
  name: 'note_read',
  description:
    'Look up your notes on your own work: how the systems you look after behave, what broke before and why, how to test things. Pass query to get the parts that mention its words, note to read one whole, or nothing to list them. Check them before work they may cover',
  input,
  effect: 'read',
  parallel: true,
  active: conversation => conversation.owner === 'bot',
  async run({ query, note }, { conversation }) {
    const notes = await memory.notes(conversation.id)
    if (note) return whole(notes, note)
    return query ? search(notes, query) : listed(notes)
  },
})
