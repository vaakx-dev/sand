import { bots } from '@sand/bots/contract'
import { compactionBrief } from '@sand/compaction/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { compactionOf } from './compaction'
import { botMemory, memoryChange, memoryChangeWire, memoryRead, memoryWrite } from './contract'
import { createMemory } from './files'

export default definePlugin({
  name: 'bot-memory',
  description: "Keeps each bot's long-term memory as one Markdown file the user can read and edit, and has the bot rewrite it whenever its conversation compacts",
  inject: { bots },
  apply(ctx) {
    const memory = createMemory(ctx.bots, (bot, changed) => ctx.emit(memoryChange, bot, changed))
    ctx.provide(botMemory, memory)
    ctx.on(compactionBrief, conversation => (conversation.owner === 'bot' ? compactionOf(memory, conversation.id) : undefined))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(memoryRead, ({ bot }) => memory.read(bot)),
        found.handle(memoryWrite, ({ bot, text }) => memory.write(bot, text)),
        ctx.on(memoryChange, (bot, changed) => found.broadcast(memoryChangeWire, [bot, changed])),
      )
    })
  },
})
