import { shell } from '@sand/ui-shell/contract'
import type { ChatContext } from './context'
import { threadOwners, threadRoute, type ThreadLive, type ThreadView } from './contract'
import { claimRoute } from './route/select'
import type { Stage } from './stage'

export const threadViewService = (ctx: ChatContext, stage: Stage, live: (thread: string) => ThreadLive | undefined): ThreadView => ({
  render: thread => stage.host(() => claimRoute(ctx, { kind: threadRoute, id: thread })),
  live,
  open: thread => {
    const owner = ctx.get(threadOwners)?.owner(thread)
    if (owner) owner.open(thread)
    else ctx.get(shell)?.open({ kind: threadRoute, id: thread })
  },
})
