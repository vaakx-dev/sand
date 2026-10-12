import { closeDrawer, navEntries, owned, place, pulse } from '@sand/kit/web'
import type {} from '@sand/nav/contract'
import type { NavAction } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { actionButton, itemButton, separator } from './button'

const wideHead = ({ appIcon }: Kit) => div({ class: 'flex h-12 shrink-0 items-center justify-center' }, span({ class: 'flex h-8 w-8 items-center justify-center' }, appIcon(20)))

export default definePlugin({
  name: 'sidebar-rail',
  description: 'Compact icon rail: one avatar per thread with status dots and tooltips',
  inject: ['nav', 'kit'],
  uses: { layout: 'lands loose on the stage' },
  apply(ctx) {
    const { nav, kit } = ctx
    const layout = pulse(ctx, ['layout.change'], ['layout'])
    const { entries, drag } = owned(ctx, () => navEntries(nav, 'y'))

    const view = () => {
      const { sideHead } = kit
      const narrow = layout.read(() => ctx.layout?.state().narrow ?? false)
      const run = (action: NavAction) => {
        nav.run(action)
        closeDrawer(ctx)
      }
      const top = derive(() => nav.actions.get().filter(action => action.place !== 'footer'))
      const footer = derive(() => nav.actions.get().filter(action => action.place === 'footer'))
      return div(
        { class: () => ['flex h-full min-h-0 flex-col bg-neutral-950 pb-3', narrow.get() ? 'w-full' : 'w-12'] },
        dynamicChild(narrow, value => (value ? sideHead('Sand', () => ctx.layout?.toggle('side', false)) : wideHead(kit))),
        div(
          { class: () => ['flex min-h-0 flex-1 flex-col gap-1', narrow.get() ? 'items-stretch px-2' : 'items-center'] },
          list(top, action => action.id, action => actionButton(kit, action, narrow, run, nav.busy), div({ class: 'contents' })),
          separator(narrow),
          list(entries, entry => entry.key, entry => itemButton(kit, entry, narrow, drag), div({ class: () => ['flex min-h-0 w-full flex-1 flex-col gap-1 overflow-auto scrollbar-none', narrow.get() ? 'items-stretch' : 'items-center'] })),
          list(footer, action => action.id, action => actionButton(kit, action, narrow, run, nav.busy), div({ class: 'contents' })),
        ),
      )
    }

    const sidebar = {}
    ctx.provide('sidebar', sidebar)
    ctx.watch('sidebar', current => (current === sidebar ? place(ctx, 'side', view) : undefined))
  },
})
