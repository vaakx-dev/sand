import { bots } from '@sand/bots/contract'
import { compactionBrief } from '@sand/compaction/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { compactionOf } from './compaction'
import { botMemory, memoryChange, memoryChangeWire, memoryRead, memoryWrite, noteChange, noteChangeWire } from './contract'
import { createMemory } from './files'
import { noteTool } from './tool'

export default definePlugin({
  name: 'bot-memory',
  description:
    "Keeps each bot's long-term knowledge in Markdown files the user can read and edit: a small memory about the user that is always in its instructions, and notes on its work it looks up when needed. The bot rewrites both whenever its conversation compacts",
  inject: { bots },
  apply(ctx) {
    const memory = createMemory(ctx.bots, {
      memory: (bot, text) => ctx.emit(memoryChange, bot, text),
      note: (bot, note) => ctx.emit(noteChange, bot, note),
    })
    ctx.provide(botMemory, memory)
    ctx.on(compactionBrief, conversation => (conversation.owner === 'bot' ? compactionOf(memory, conversation.id) : undefined))
    ctx.watch(tools, found => found?.register(noteTool(memory)))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(memoryRead, ({ bot }) => memory.read(bot)),
        found.handle(memoryWrite, ({ bot, text }) => memory.write(bot, text)),
        ctx.on(memoryChange, (bot, text) => found.broadcast(memoryChangeWire, [bot, text])),
        ctx.on(noteChange, (bot, note) => found.broadcast(noteChangeWire, [bot, note])),
      )
    })
  },
})
