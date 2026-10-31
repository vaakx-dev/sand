import { pcs, wire } from '@sand/devices-contract'
import { githubClient } from '@sand/github/contract'
import { toasts } from '@sand/toasts/contract'
import { threads, turns } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { type PullOpenRequest, pullLink, pullLinks, pullLinksClient, pullOpen, pullUnlink, pullWatch, type ThreadPulls } from '../contract'
import { pullAgent } from './ask'
import { linkStore } from './store'

export default definePlugin({
  name: 'pull-links',
  description:
    "Keeps every PC's thread pull requests for the page, finds the threads working on a pull request, links, unlinks and watches them, opens a pull request as a thread and asks its agent about it",
  inject: { wire, pcs, threads, turns, toasts, github: githubClient },
  apply(ctx) {
    const { wire } = ctx
    const store = linkStore(ctx, { wire, pcs: ctx.pcs, github: ctx.github })
    const kept = (device: string) => (pulls: ThreadPulls) => {
      store.apply(device, pulls)
      return pulls
    }
    const open = (input: PullOpenRequest, device: string) => wire.call(pullOpen, input, device)
    const agent = pullAgent({ toasts: ctx.toasts, turns: ctx.turns, threads: ctx.threads, github: ctx.github, threadsOf: store.threadsOf, open })
    ctx.provide(pullLinksClient, {
      of: store.of,
      loaded: store.loaded,
      threadsOf: store.threadsOf,
      links: (input, device) => wire.call(pullLinks, input, device).then(kept(device)),
      link: (input, device) => wire.call(pullLink, input, device).then(kept(device)),
      unlink: (input, device) => wire.call(pullUnlink, input, device).then(kept(device)),
      watch: (input, device) => wire.call(pullWatch, input, device).then(kept(device)),
      open,
      openThread: agent.openThread,
      ask: agent.ask,
    })
  },
})
