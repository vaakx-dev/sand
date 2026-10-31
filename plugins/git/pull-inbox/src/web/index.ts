import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { pullInboxClient, pullsInbox, pullsInboxCount, pullsInboxCountChange, pullsInboxRow } from '../contract'

export default definePlugin({
  name: 'pull-inbox',
  description: "Reaches this PC's pull request inbox for the page: pages of pull requests, the count that needs you, and rows as they change",
  inject: { wire },
  apply(ctx) {
    const { wire } = ctx
    ctx.provide(pullInboxClient, {
      page: input => wire.call(pullsInbox, input),
      count: () => wire.call(pullsInboxCount, {}),
      onCount: listener => wire.on(pullsInboxCountChange, count => listener(count)),
      onRow: listener => wire.on(pullsInboxRow, pull => listener(pull)),
    })
  },
})
