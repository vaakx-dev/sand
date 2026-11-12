import type { Markdown } from '@sand/markdown/contract'
import { memoryLimit, noteLimit, type MemoryFiles, type Note } from '@sand/memory/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, show, type Sig } from '@vaakx-dev/vrui'

interface ViewParts {
  kit: Kit
  markdown: Markdown
  files(): MemoryFiles | undefined
  about: string
  saveMemory(text: string): Promise<unknown>
  saveNote(note: Note): Promise<unknown>
}

const written = ({ markdown }: ViewParts) => (text: string) => div({ class: 'flex flex-col gap-2' }, ...markdown.nodes(text))

const memoryBlock = (parts: ViewParts) =>
  parts.kit.editable({
    title: 'Memory',
    note: parts.about,
    text: () => parts.files()?.text ?? '',
    view: written(parts),
    empty: 'Nothing remembered yet.',
    save: parts.saveMemory,
    rows: 16,
    maxLength: memoryLimit,
    placeholder: 'What to remember in every conversation',
  })

const noteBlock = (parts: ViewParts, note: Sig<Note>) =>
  parts.kit.editable({
    title: note.get().name,
    text: () => note.get().text,
    view: written(parts),
    empty: 'Empty.',
    save: text => parts.saveNote({ name: note.get().name, text }),
    rows: 10,
    maxLength: noteLimit,
    placeholder: 'Leave it empty to remove the note',
  })

const notesBlock = (parts: ViewParts) => {
  const notes = derive(() => parts.files()?.notes ?? [])
  return show(
    () => notes.get().length > 0,
    () =>
      parts.kit.pageSection(
        { title: 'Notes', note: 'Read when a conversation needs them.' },
        list(notes, note => note.name, note => noteBlock(parts, note), div({ class: 'flex flex-col gap-4 border-l border-neutral-700 pl-3' })),
      ),
  )
}

const memoryView = (parts: ViewParts) =>
  div(
    { class: 'flex min-w-0 flex-col gap-6 p-4' },
    dynamicChild(
      derive(() => parts.files() !== undefined),
      loaded => (loaded ? div({ class: 'flex flex-col gap-6' }, memoryBlock(parts), notesBlock(parts)) : parts.kit.loadingState()),
    ),
  )

export { memoryView }
