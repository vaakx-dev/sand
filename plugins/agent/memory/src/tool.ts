import type { Conversation } from '@sand/engine/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { type MemoryRef, type MemoryStore, noteName } from './contract'

type Place = { kind: 'root' } | { kind: 'notes' } | { kind: 'memory' } | { kind: 'note'; name: string }

type FilePlace = Extract<Place, { kind: 'memory' | 'note' }>

interface MemoryFile {
  path: string
  read(): Promise<string | undefined>
  write(text: string): Promise<void>
}

const ROOT = '/memories'
const MEMORY_PATH = `${ROOT}/memory.md`
const NOTES_PATH = `${ROOT}/notes`
const LINE_NUMBER_WIDTH = 6

const commands = ['view', 'create', 'str_replace', 'insert', 'delete', 'rename'] as const

const input = z.object({
  command: z.enum(commands),
  path: z.string().optional().describe('A path in /memories'),
  view_range: z.array(z.number().int()).length(2).optional().describe('First and last line to view; -1 as the last means to the end'),
  file_text: z.string().optional().describe('The whole text of the file to create'),
  old_str: z.string().optional().describe('Text to replace; it must appear exactly once'),
  new_str: z.string().optional().describe('Text to put in its place'),
  insert_line: z.number().int().min(0).optional().describe('The line to insert after; 0 for the start'),
  insert_text: z.string().optional().describe('Text to insert'),
  old_path: z.string().optional().describe('The file to rename'),
  new_path: z.string().optional().describe('Its new path'),
})

type Input = z.output<typeof input>

const description =
  'Your memory, for what you learn that no tool call can find again, so it carries over to later conversations: files in /memories. /memories/memory.md loads into every conversation, and the notes in /memories/notes are listed there by their first line. Write to it when the person asks, or when something is clearly worth remembering.'

const notePath = (name: string) => `${NOTES_PATH}/${name}.md`

const placeOf = (path: string): Place => {
  const clean = path.trim().replace(/\/+$/, '')
  if (clean === ROOT) return { kind: 'root' }
  if (clean === NOTES_PATH) return { kind: 'notes' }
  if (clean === MEMORY_PATH) return { kind: 'memory' }
  const name = clean.startsWith(`${NOTES_PATH}/`) && clean.endsWith('.md') ? clean.slice(NOTES_PATH.length + 1, -'.md'.length) : ''
  if (noteName().safeParse(name).success) return { kind: 'note', name }
  throw new Error(`${path} isn't in memory. Memory holds ${MEMORY_PATH} and notes at ${NOTES_PATH}/<name>.md, named with letters, numbers, spaces, dots, dashes and underscores.`)
}

const given = <T>(value: T | undefined, field: string, command: string) => {
  if (value === undefined) throw new Error(`${command} needs ${field}`)
  return value
}

const numbered = (text: string, [first = 1, last = -1]: number[] = []) => {
  const lines = text.split('\n')
  const end = last === -1 ? lines.length : last
  return lines
    .slice(first - 1, end)
    .map((line, index) => `${String(first + index).padStart(LINE_NUMBER_WIDTH)}\t${line}`)
    .join('\n')
}

const occurrences = (text: string, part: string) => (part ? text.split(part).length - 1 : 0)

const fileAt = (store: MemoryStore, ref: MemoryRef, place: FilePlace): MemoryFile =>
  place.kind === 'memory'
    ? { path: MEMORY_PATH, read: () => store.read(ref), write: text => store.write(ref, text) }
    : {
        path: notePath(place.name),
        read: async () => (await store.notes(ref)).find(note => note.name === place.name)?.text,
        write: text => store.writeNote(ref, { name: place.name, text }),
      }

const memoryTool = (store: MemoryStore, of: (conversation: Conversation) => MemoryRef | undefined): Tool<typeof input> => {
  const file = (ref: MemoryRef, path: string) => {
    const place = placeOf(path)
    if (place.kind === 'root' || place.kind === 'notes') throw new Error(`${path} is a folder`)
    return fileAt(store, ref, place)
  }

  const existing = async (target: MemoryFile) => {
    const text = await target.read()
    if (text === undefined) throw new Error(`${target.path} doesn't exist`)
    return text
  }

  const listing = async (ref: MemoryRef, place: Place) => {
    const notes = (await store.notes(ref)).map(note => `${note.text.length}\t${notePath(note.name)}`)
    const memoryLine = `${(await store.read(ref)).length}\t${MEMORY_PATH}`
    const lines = place.kind === 'root' ? [memoryLine, `\t${NOTES_PATH}`, ...notes] : notes
    return `Files in ${place.kind === 'root' ? ROOT : NOTES_PATH}, with their size in characters:\n${lines.join('\n') || '(none)'}`
  }

  const view = async (ref: MemoryRef, path: string, range?: number[]) => {
    const place = placeOf(path)
    if (place.kind === 'root' || place.kind === 'notes') return listing(ref, place)
    const target = fileAt(store, ref, place)
    const text = await existing(target)
    return text ? `${target.path}:\n${numbered(text, range)}` : `${target.path} is empty.`
  }

  const replace = async (target: MemoryFile, before: string, after: string) => {
    const text = await existing(target)
    const found = occurrences(text, before)
    if (found === 0) throw new Error(`Nothing replaced: the text doesn't appear verbatim in ${target.path}`)
    if (found > 1) throw new Error(`Nothing replaced: the text appears ${found} times in ${target.path}; it must appear once`)
    await target.write(text.replace(before, () => after))
    return `Edited ${target.path}.`
  }

  const insert = async (target: MemoryFile, line: number, added: string) => {
    const lines = (await existing(target)).split('\n')
    if (line > lines.length) throw new Error(`${target.path} has ${lines.length} lines`)
    await target.write([...lines.slice(0, line), added, ...lines.slice(line)].join('\n'))
    return `Edited ${target.path}.`
  }

  const remove = async (target: MemoryFile) => {
    await existing(target)
    await target.write('')
    return `Deleted ${target.path}.`
  }

  const rename = async (from: MemoryFile, to: MemoryFile) => {
    const text = await existing(from)
    if (from.path === to.path) return `${to.path} already has that name.`
    if ((await to.read())?.trim()) throw new Error(`${to.path} already exists`)
    await to.write(text)
    await from.write('')
    return `Renamed ${from.path} to ${to.path}.`
  }

  const run = async (ref: MemoryRef, { command, ...args }: Input) => {
    const path = () => given(args.path, 'path', command)
    switch (command) {
      case 'view':
        return view(ref, path(), args.view_range)
      case 'create':
        await file(ref, path()).write(given(args.file_text, 'file_text', command))
        return `Saved ${path()}.`
      case 'str_replace':
        return replace(file(ref, path()), given(args.old_str, 'old_str', command), args.new_str ?? '')
      case 'insert':
        return insert(file(ref, path()), given(args.insert_line, 'insert_line', command), given(args.insert_text, 'insert_text', command))
      case 'delete':
        return remove(file(ref, path()))
      case 'rename':
        return rename(file(ref, given(args.old_path, 'old_path', command)), file(ref, given(args.new_path, 'new_path', command)))
    }
  }

  return {
    name: 'memory',
    description,
    input,
    effect: 'write',
    active: conversation => of(conversation) !== undefined,
    run(args, { conversation }) {
      const ref = of(conversation)
      if (!ref) throw new Error('This conversation has no memory')
      return run(ref, args)
    },
  }
}

export { memoryTool }
