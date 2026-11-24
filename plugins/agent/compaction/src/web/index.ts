import { type ChatRef, composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { compactTimeoutMs, contextCompact } from '../contract'
import { idleSettings } from './settings'

export default definePlugin({
  name: 'compaction-controls',
  description: 'The /compact command, which compacts the open chat now, and the Compaction settings for idle chats',
  inject: { wire, kit },
  apply(ctx) {
    const compact = async (chat: ChatRef | undefined) => {
      if (!chat) throw new Error('Open a chat to compact it')
      await ctx.wire.call(contextCompact, { session: chat.id, owner: chat.owner }, chat.pc, { timeout: compactTimeoutMs })
    }
    ctx.watch(composer, found => found?.command({ name: 'compact', description: 'Summarize the chat so far to free up context', run: compact }))
    idleSettings(ctx)
  },
})
