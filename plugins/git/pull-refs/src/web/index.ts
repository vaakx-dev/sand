import { composer } from '@sand/composer/contract'
import { contextChips } from '@sand/context/contract'
import { pullPage } from '@sand/git-pull-page/contract'
import type { PullRef, PullSummary } from '@sand/github/contract'
import { pullInboxClient, type PullInboxClient } from '@sand/pull-inbox/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { pullUrl } from '../pull'
import { pullChip } from './chip'
import { pullTrigger } from './trigger'

const inboxFresh = 60_000

export default definePlugin({
  name: 'pull-refs',
  description: 'Lists pull requests after # in the composer, links the one you pick as a chip, and opens it from the chip',
  inject: { kit, threads },
  apply(ctx) {
    let inbox: { at: number; pulls: Promise<PullSummary[]> } | undefined

    const linked = () => {
      const current = ctx.threads.current()
      const links = current ? (ctx.get(pullLinksClient)?.of(current.id) ?? []) : []
      return links.flatMap(link => link.summary ?? [])
    }

    const fetchInbox = (client: PullInboxClient) =>
      client.page({ view: 'all' }).then(
        page => page.pulls,
        error => {
          inbox = undefined
          throw error
        },
      )

    const inboxPulls = () => {
      const client = ctx.get(pullInboxClient)
      if (!client) return Promise.resolve([])
      if (!inbox || Date.now() - inbox.at > inboxFresh) inbox = { at: Date.now(), pulls: fetchInbox(client) }
      return inbox.pulls
    }

    const open = (pull: PullRef) => {
      const page = ctx.get(pullPage)
      if (page) page.open({ repo: pull.repo, number: pull.number })
      else ctx.kit.openTab(pullUrl(pull))
    }

    ctx.watch(composer, found => found?.trigger(pullTrigger({ linked, inbox: inboxPulls })))
    ctx.watch(contextChips, found => found?.register(pullChip(open)))
  },
})
