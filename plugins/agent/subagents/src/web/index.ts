import { owned, pulse } from '@sand/reactive'
import { toolViews, transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { effect, onInterval, sig } from '@vaakx-dev/vrui'
import { threadChange, threads, turns } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { threadNotice } from './notification'
import { type Agents, agentRenderer, subAgentOf } from './tool'

const refresh = 5000

export default definePlugin({
  name: 'subagents-view',
  description: 'Shows agent calls in the chat with a bot icon and the state of their sub-agent thread, and thread reports as cards',
  inject: { kit, toolViews },
  apply(ctx) {
    const changes = pulse(ctx, [threadChange], [threads])
    const chats = () => ctx.get(threads)
    const tick = sig(0)
    owned(ctx, () => {
      const running = changes.read(() => chats()?.list().some(chat => chat.info.kind === 'agent' && chat.turn) ?? false)
      effect(() => {
        if (running.get()) onInterval(() => tick.update(value => value + 1), refresh)
      })
    })
    const agents: Agents = {
      of(tool) {
        changes.version.get()
        return subAgentOf(chats(), tool.thread, tool.call.id)
      },
      now() {
        tick.get()
        return Date.now()
      },
      open: id => void chats()?.select(id),
      stop: id => void ctx.get(turns)?.interrupt(id),
    }
    ctx.watch(
      transcript,
      found => found && joinDisposers(found.tool('agent', agentRenderer(ctx.kit, ctx.toolViews, agents)), found.notice('thread', threadNotice(ctx.kit, chats))),
    )
  },
})
