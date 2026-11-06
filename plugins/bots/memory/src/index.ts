import { bots } from '@sand/bots/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { botMemory, memoryChange, memoryChangeWire, memoryList, memoryRead, memoryRemove, memoryWrite } from './contract'
import { createMemory } from './files'
import { memoryTool } from './tool'

export default definePlugin({
  name: 'bot-memory',
  description: "Keeps each bot's memory as Markdown files in its folder, for the bot and the user to read and edit",
  inject: { bots },
  apply(ctx) {
    const memory = createMemory(ctx.bots, (bot, files) => ctx.emit(memoryChange, bot, files))
    ctx.provide(botMemory, memory)
    ctx.watch(tools, found => found?.register(memoryTool(memory)))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(memoryList, ({ bot }) => memory.list(bot)),
        found.handle(memoryRead, ({ bot, name }) => memory.read(bot, name)),
        found.handle(memoryWrite, ({ bot, name, text }) => memory.write(bot, name, text)),
        found.handle(memoryRemove, ({ bot, name }) => memory.remove(bot, name)),
        ctx.on(memoryChange, (bot, files) => found.broadcast(memoryChangeWire, [bot, files])),
      )
    })
  },
})
