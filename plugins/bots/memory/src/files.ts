import type { Bots } from '@sand/bots/contract'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { BotMemory, MemoryFile } from './contract'

const missing = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ENOENT'

export const createMemory = (bots: Bots, changed: (bot: string, files: MemoryFile[]) => void): BotMemory => {
  const folder = (bot: string) => {
    if (!bots.get(bot)) throw new Error(`No bot ${bot}`)
    return join(bots.folder(bot), 'memory')
  }

  const list = async (bot: string) => {
    const dir = folder(bot)
    const names = await readdir(dir).catch((error: unknown) => {
      if (missing(error)) return []
      throw error
    })
    const files = await Promise.all(
      names
        .filter(name => name.endsWith('.md'))
        .map(async name => {
          const info = await stat(join(dir, name))
          return { name, size: info.size, updated: info.mtimeMs }
        }),
    )
    return files.sort((a, b) => a.name.localeCompare(b.name))
  }

  const announce = async (bot: string) => {
    const files = await list(bot)
    changed(bot, files)
    return files
  }

  return {
    list,
    read: (bot, name) => Bun.file(join(folder(bot), name)).text(),
    async write(bot, name, text) {
      await mkdir(folder(bot), { recursive: true })
      await Bun.write(join(folder(bot), name), text)
      return announce(bot)
    },
    async remove(bot, name) {
      await rm(join(folder(bot), name), { force: true })
      return announce(bot)
    },
  }
}
