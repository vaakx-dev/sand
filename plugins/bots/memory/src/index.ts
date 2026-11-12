import { bots } from '@sand/bots/contract'
import { memory, type MemorySpace } from '@sand/memory/contract'
import { definePlugin } from 'drydock'
import { botMemorySpace } from './contract'

export default definePlugin({
  name: 'bot-memory',
  description: 'Gives each bot a memory of its own, kept in its folder',
  inject: { bots },
  apply(ctx) {
    const space: MemorySpace = {
      name: botMemorySpace,
      title: 'Your memory',
      about: 'Yours alone, across all your conversations.',
      of: conversation => (conversation.owner === 'bot' ? conversation.id : undefined),
      folder(bot) {
        if (!ctx.bots.get(bot)) throw new Error(`No bot ${bot}`)
        return ctx.bots.folder(bot)
      },
    }
    ctx.watch(memory, found => found?.space(space))
  },
})
