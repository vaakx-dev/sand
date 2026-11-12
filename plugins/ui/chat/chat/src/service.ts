import { shell } from '@sand/ui-shell/contract'
import type { ChatContext } from './context'
import { threadOwners, threadRoute, type ThreadView } from './contract'
import type { ThreadScreens } from './screens'

export const threadViewService = (ctx: ChatContext, screens: ThreadScreens): ThreadView => ({
  render: screens.thread,
  open: thread => {
    const owner = ctx.get(threadOwners)?.owner(thread)
    if (owner) owner.open(thread)
    else ctx.get(shell)?.open({ kind: threadRoute, id: thread })
  },
})
