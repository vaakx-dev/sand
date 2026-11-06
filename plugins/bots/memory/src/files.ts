import type { Bots } from '@sand/bots/contract'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { BotMemory } from './contract'

export const createMemory = (bots: Bots, changed: (bot: string, text: string) => void): BotMemory => {
  const folder = (bot: string) => {
    if (!bots.get(bot)) throw new Error(`No bot ${bot}`)
    return bots.folder(bot)
  }

  return {
    async read(bot) {
      const file = Bun.file(join(folder(bot), 'memory.md'))
      return (await file.exists()) ? file.text() : ''
    },
    async write(bot, text) {
      await mkdir(folder(bot), { recursive: true })
      await Bun.write(join(folder(bot), 'memory.md'), text)
      changed(bot, text)
    },
  }
}
