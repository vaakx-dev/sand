import { shell } from '@sand/ui-shell/contract'
import type { ChatContext } from './context'
import { threadOwners, threadRoute, type ThreadLive, type ThreadView } from './contract'
import type { ThreadScreens } from './screens'

export const threadViewService = (ctx: ChatContext, screens: ThreadScreens, live: (thread: string) => ThreadLive | undefined): ThreadView => ({
  render: screens.thread,
  live,
  open: thread => {
    const owner = ctx.get(threadOwners)?.owner(thread)
    if (owner) owner.open(thread)
    else ctx.get(shell)?.open({ kind: threadRoute, id: thread })
  },
})
