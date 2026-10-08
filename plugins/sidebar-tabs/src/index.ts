import { div, el, icon, list, navEntries, navHost, owned, place } from '@sand/dom'
import { definePlugin } from 'drydock'
import { actionIcon, tabButton } from './tab'

export default definePlugin({
  name: 'sidebar-tabs',
  description: 'Top tab strip: one tab per open thread, actions on the right',
  uses: { layout: 'lands loose on the stage' },
  apply(ctx) {
    const host = navHost(ctx)
    const { entries, drag } = owned(ctx, () => navEntries(host, { axis: 'x' }))

    const view = () =>
      div(
        { class: 'flex h-12 min-w-0 shrink-0 items-center gap-1 bg-neutral-950 px-3' },
        div(
          { class: 'flex shrink-0 items-center gap-2 pl-1 pr-2 text-sm font-semibold text-neutral-300' },
          icon('logo', 15),
          el('b', { class: 'hidden md:inline' }, 'sand'),
        ),
        list(entries, entry => entry.key, entry => tabButton(entry, drag), div({ class: 'flex min-w-0 flex-1 items-center gap-1 overflow-auto scrollbar-none' })),
        list(host.actions, action => action.id, action => actionIcon(action, host), div({ class: 'flex shrink-0 items-center gap-1 pl-2' })),
      )

    ctx.provide('nav', host.nav)
    ctx.watch('nav', nav => (nav === host.nav ? place(ctx, 'top', view, 0) : undefined))
  },
})
