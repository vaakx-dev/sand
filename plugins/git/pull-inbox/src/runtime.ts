import { authChanged, github, pullChanged, pullCreated } from '@sand/github/contract'
import { pagesChange, type Server, server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { pullsInboxCountChange, pullsInboxRow } from './contract'
import { createCount } from './count/count'
import { createPoll } from './count/poll'
import { createInbox } from './inbox/inbox'
import { serveInbox } from './requests'

export default definePlugin({
  name: 'pull-inbox',
  description: "Lists the signed-in GitHub user's pull requests across every repo, sorted into your turn, ready to merge and waiting, and counts the ones that need you",
  inject: { github },
  apply(ctx) {
    let live: Server | undefined
    const inbox = createInbox({ github: ctx.github, needsRead: list => count.read(list) })
    const count = createCount({
      needs: fresh => inbox.needs(fresh),
      changed: next => live?.broadcast(pullsInboxCountChange, next),
      report: error => ctx.report(error),
    })
    const poll = createPoll(() => count.soon(true))

    ctx.effect(() => () => {
      poll.set(false)
      count.stop()
      inbox.clear()
    })
    ctx.on(pullChanged, summary => {
      const row = inbox.patch(summary)
      if (row) live?.broadcast(pullsInboxRow, row)
      count.soon()
    })
    ctx.on(pullCreated, () => count.soon(true))
    ctx.on(authChanged, () => {
      inbox.clear()
      count.soon(true)
    })
    ctx.on(pagesChange, pages => poll.set(pages > 0))
    ctx.watch(server, found => {
      if (!found) return
      live = found
      poll.set(found.pages() > 0)
      const stop = serveInbox(found, inbox, count)
      return () => {
        live = undefined
        poll.set(false)
        stop()
      }
    })
  },
})
