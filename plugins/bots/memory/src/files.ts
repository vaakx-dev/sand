import type { Bots } from '@sand/bots/contract'
import { writeAtomic } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { type BotMemory, type Note, noteName } from './contract'

const extension = '.md'

export const createMemory = (bots: Bots, changed: { memory(bot: string, text: string): void; note(bot: string, note: Note): void }): BotMemory => {
  const folder = (bot: string) => {
    if (!bots.get(bot)) throw new Error(`No bot ${bot}`)
    return bots.folder(bot)
  }
  const notesFolder = (bot: string) => join(folder(bot), 'notes')

  const names = async (bot: string) => {
    const where = notesFolder(bot)
    const files = existsSync(where) ? await readdir(where) : []
    return files
      .filter(file => file.endsWith(extension))
      .map(file => file.slice(0, -extension.length))
      .filter(name => noteName.safeParse(name).success)
      .sort()
  }

  return {
    async read(bot) {
      const file = Bun.file(join(folder(bot), 'memory.md'))
      return (await file.exists()) ? file.text() : ''
    },
    async write(bot, text) {
      await mkdir(folder(bot), { recursive: true })
      await writeAtomic(join(folder(bot), 'memory.md'), text)
      changed.memory(bot, text)
    },
    async notes(bot) {
      return Promise.all((await names(bot)).map(async name => ({ name, text: await Bun.file(join(notesFolder(bot), `${name}${extension}`)).text() })))
    },
    async writeNote(bot, note) {
      const path = join(notesFolder(bot), `${noteName.parse(note.name)}${extension}`)
      if (note.text.trim()) {
        await mkdir(notesFolder(bot), { recursive: true })
        await writeAtomic(path, note.text)
      } else await rm(path, { force: true })
      changed.note(bot, note)
    },
  }
}
