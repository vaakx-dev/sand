import { toolViews, transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { shell } from '@sand/ui-shell/contract'
import { threadRouteKind, turns } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { childWatch } from './children'
import { threadNotice } from './notification'
import { agentRenderer } from './tool'

export default definePlugin({
  name: 'subagents-view',
  description: 'Shows agent calls in the chat with a bot icon and the state of the subagent they started, and the reports threads send back as cards that open them',
  inject: { kit, toolViews },
  apply(ctx) {
    const watch = childWatch(ctx)
    const open = (thread: string) => ctx.get(shell)?.open({ kind: threadRouteKind, id: thread })
    const stop = (thread: string) => void ctx.get(turns)?.stop(thread).catch(error => ctx.report(error))
    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(found.tool('agent', agentRenderer(ctx.kit, ctx.toolViews, watch, { open, stop })), found.notice('thread', threadNotice(ctx.kit, open))),
    )
  },
})
