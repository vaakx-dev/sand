import type { PullLink } from '@sand/pull-links/contract'
import type { RowDecoration, Sidebar } from '@sand/sidebar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { threadsChange } from '@sand/web-client/contract'
import { span } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { PullsContext } from '../inject'
import { primaryOf } from '../links/rank'
import type { LinkStore } from '../links/store'
import { attentionLook, pullName, pullTitle } from '../pull/look'

const pullPill = (kit: Kit, link: PullLink) => span({ class: 'inline-flex shrink-0', title: pullTitle(link) }, kit.badge(attentionLook(link.summary).tone, pullName(link)))

const pullDecoration = (kit: Kit, store: LinkStore): RowDecoration => ({
  id: 'git-pulls',
  order: 40,
  badge(thread) {
    if (thread.draft) return null
    const link = primaryOf(store.read(thread.id))
    return link ? pullPill(kit, link) : null
  },
})

export const showPullRows = (ctx: PullsContext, sidebar: Sidebar, store: LinkStore): Dispose => {
  const sync = () => {
    for (const thread of ctx.threads.list()) if (thread.info.kind === 'thread') store.ensure(thread.id, thread.device)
  }
  sync()
  const stops = [ctx.on(threadsChange, sync), sidebar.decorate(pullDecoration(ctx.kit, store))]
  return () => {
    for (const stop of stops) void stop()
  }
}
