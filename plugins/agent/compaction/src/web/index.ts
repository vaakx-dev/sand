import { type ChatRef, composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { compactTimeoutMs, contextCompact } from '../contract'

export default definePlugin({
  name: 'compact-command',
  description: 'The /compact command: compacts the open chat now instead of waiting for it to compact by itself',
  inject: { wire },
  apply(ctx) {
    const compact = async (chat: ChatRef | undefined) => {
      if (!chat) throw new Error('Open a chat to compact it')
      await ctx.wire.call(contextCompact, { session: chat.id, owner: chat.owner }, chat.pc, { timeout: compactTimeoutMs })
    }
    ctx.watch(composer, found => found?.command({ name: 'compact', description: 'Summarize the chat so far to free up context', run: compact }))
  },
})
