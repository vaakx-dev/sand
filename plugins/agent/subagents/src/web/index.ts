import { toolViews, transcript } from '@sand/chat/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { jobWatch } from './jobs'
import { notificationRenderer, notificationTag } from './notification'
import { agentRenderer } from './tool'

export default definePlugin({
  name: 'subagents-view',
  description: 'Shows agent calls in the chat with a bot icon and the state of their background run, and background results as cards',
  inject: { kit, toolViews },
  apply(ctx) {
    const watch = jobWatch(ctx)
    const chats = () => ctx.get(threads)
    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(
          found.tool('agent', agentRenderer(ctx.kit, ctx.toolViews, watch, chats)),
          found.entry(notificationTag, notificationRenderer(ctx.kit, watch, chats)),
        ),
    )
  },
})
