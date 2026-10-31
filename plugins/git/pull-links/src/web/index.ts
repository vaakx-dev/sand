import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { pullLink, pullLinks, pullLinksAll, pullLinksClient, pullOpen, pullUnlink, pullWatch, threadPullsChange } from '../contract'

export default definePlugin({
  name: 'pull-links',
  description: "Reaches thread pull requests for the page: lists, links, unlinks and watches them, and opens a pull request as a thread",
  inject: { wire },
  apply(ctx) {
    const { wire } = ctx
    ctx.provide(pullLinksClient, {
      links: (input, device) => wire.call(pullLinks, input, device),
      linksAll: device => wire.call(pullLinksAll, {}, device),
      link: (input, device) => wire.call(pullLink, input, device),
      unlink: (input, device) => wire.call(pullUnlink, input, device),
      watch: (input, device) => wire.call(pullWatch, input, device),
      open: (input, device) => wire.call(pullOpen, input, device),
      onChange: listener => wire.on(threadPullsChange, listener, { from: 'all' }),
    })
  },
})
