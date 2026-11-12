import { sectionLength } from '@sand/compaction/contract'
import { oneLine } from '@sand/util'
import { type MemoryRef, type MemorySpace, type MemoryStore, type Note, noteAbout } from './contract'

const ABOUT_LENGTH = 160

const SECTION_END = /(?:\n<\/memory>|\/memories\/memory\.md is empty so far\.)\n\n(?:No notes yet\.|Notes:(?:\n- \/memories\/notes\/.*)+)/

const memoryOf = (text: string) => (text.trim() ? `<memory>\n${text.trim()}\n</memory>` : '/memories/memory.md is empty so far.')

const notesOf = (notes: Note[]) =>
  notes.length ? `Notes:\n${notes.map(note => `- /memories/notes/${note.name}.md: ${oneLine(noteAbout(note), ABOUT_LENGTH)}`).join('\n')}` : 'No notes yet.'

const headingOf = (space: MemorySpace) =>
  `## ${space.title}\n\n${space.about} It carries what you learn that no tool call can find again over to later conversations.\n\n`

const memorySection = async (store: MemoryStore, space: MemorySpace, ref: MemoryRef) => {
  const [text, notes] = await Promise.all([store.read(ref), store.notes(ref)])
  return `${headingOf(space)}${memoryOf(text)}\n\n${notesOf(notes)}`
}

const memorySectionLength = (system: string, space: MemorySpace) => sectionLength(system, headingOf(space), SECTION_END)

export { memorySection, memorySectionLength }
