import { writeAtomic } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { type MemoryRef, type MemoryStore, memoryLimit, type Note, noteLimit, noteName } from './contract'

interface StoreOptions {
  folder(ref: MemoryRef): string
  changed(ref: MemoryRef, text: string): void
  stored(ref: MemoryRef): void
}

const extension = '.md'

const tooLong = (what: string, text: string, limit: number) => {
  const size = text.trim().length
  if (size > limit) throw new Error(`${what} would be ${size} characters, over its ${limit} limit`)
}

const createStore = ({ folder, changed, stored }: StoreOptions): MemoryStore => {
  const memoryFile = (ref: MemoryRef) => join(folder(ref), 'memory.md')
  const notesFolder = (ref: MemoryRef) => join(folder(ref), 'notes')
  const noteFile = (ref: MemoryRef, name: string) => join(notesFolder(ref), `${noteName().parse(name)}${extension}`)

  const names = async (ref: MemoryRef) => {
    const where = notesFolder(ref)
    const files = existsSync(where) ? await readdir(where) : []
    return files
      .filter(file => file.endsWith(extension))
      .map(file => file.slice(0, -extension.length))
      .filter(name => noteName().safeParse(name).success)
      .sort()
  }

  const saveNote = async (ref: MemoryRef, path: string, text: string) => {
    await mkdir(notesFolder(ref), { recursive: true })
    await writeAtomic(path, text)
  }

  return {
    async read(ref) {
      const file = Bun.file(memoryFile(ref))
      return (await file.exists()) ? file.text() : ''
    },
    async write(ref, text) {
      tooLong('memory.md', text, memoryLimit)
      await mkdir(folder(ref), { recursive: true })
      await writeAtomic(memoryFile(ref), text)
      changed(ref, text)
      stored(ref)
    },
    async notes(ref) {
      return Promise.all((await names(ref)).map(async name => ({ name, text: await Bun.file(noteFile(ref, name)).text() })))
    },
    async writeNote(ref, { name, text }: Note) {
      const path = noteFile(ref, name)
      tooLong(`The note ${name}`, text, noteLimit)
      if (text.trim()) await saveNote(ref, path, text)
      else await rm(path, { force: true })
      stored(ref)
    },
  }
}

export { createStore }
