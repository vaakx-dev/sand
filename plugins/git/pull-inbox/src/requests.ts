import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { pullsInbox, pullsInboxCount } from './contract'
import type { Count } from './count/count'
import type { Inbox } from './inbox/inbox'

export const serveInbox = (server: Server, inbox: Inbox, count: Count) =>
  joinDisposers(
    server.handle(pullsInbox, query => inbox.page(query)),
    server.handle(pullsInboxCount, () => count.get()),
  )
