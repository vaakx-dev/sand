import { navEntries, owned, place } from '@sand/kit/web'
import { div, el, list, span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { actionIcon, tabButton } from './tab'

export default definePlugin({
  name: 'sidebar-tabs',
  description: 'Top tab strip: one tab per open thread, actions on the right',
  inject: ['nav', 'kit'],
  uses: { layout: 'lands loose on the stage' },
  apply(ctx) {
    const { nav, kit } = ctx
    const { entries, drag } = owned(ctx, () => navEntries(nav, 'x'))

    const view = () => {
      const { appIcon, paneHead } = kit
      return paneHead(
        { led: true, class: 'min-w-0 bg-neutral-950' },
        span({ class: 'flex h-8 w-8 shrink-0 items-center justify-center' }, appIcon(20)),
        el('b', { class: 'hidden shrink-0 pr-2 text-sm font-semibold text-neutral-300 md:inline', style: { textBox: 'trim-both cap alphabetic' } }, 'Sand'),
        list(entries, entry => entry.key, entry => tabButton(kit, entry, drag), div({ class: 'flex min-w-0 flex-1 items-center gap-1 overflow-auto scrollbar-none' })),
        list(nav.actions, action => action.id, action => actionIcon(kit, action, nav), div({ class: 'flex shrink-0 items-center gap-1 pl-2' })),
      )
    }

    const sidebar = {}
    ctx.provide('sidebar', sidebar)
    ctx.watch('sidebar', current => (current === sidebar ? place(ctx, 'top', view, 0) : undefined))
  },
})
