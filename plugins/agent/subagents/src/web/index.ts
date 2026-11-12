import { toolViews, transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { shell } from '@sand/ui-shell/contract'
import { threadRouteKind, threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { jobWatch } from './jobs'
import { jobNotice } from './notification'
import { agentRenderer } from './tool'

export default definePlugin({
  name: 'subagents-view',
  description: 'Shows agent calls in the chat with a bot icon and the state of their background run, and background results as cards',
  inject: { kit, toolViews },
  apply(ctx) {
    const watch = jobWatch(ctx)
    const chats = () => ctx.get(threads)
    const open = (thread: string) => ctx.get(shell)?.open({ kind: threadRouteKind, id: thread })
    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(
          found.tool('agent', agentRenderer(ctx.kit, ctx.toolViews, watch, chats, open)),
          found.notice('job', jobNotice(ctx.kit, watch, chats, open)),
        ),
    )
  },
})
