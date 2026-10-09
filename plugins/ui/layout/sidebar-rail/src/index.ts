import type { NavAction } from '@sand/protocol'
import { closeDrawer, derive, div, icon, list, navEntries, navHost, owned, place, pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { actionButton, itemButton, separator } from './button'

export default definePlugin({
  name: 'sidebar-rail',
  description: 'Compact icon rail: one avatar per thread with status dots and tooltips',
  uses: { layout: 'lands loose on the stage' },
  apply(ctx) {
    const host = navHost(ctx)
    const layout = pulse(ctx, ['layout.change'], ['layout'])
    const { entries, drag } = owned(ctx, () => navEntries(host, { axis: 'y', onPick: () => closeDrawer(ctx) }))

    const view = () => {
      const narrow = layout.read(() => ctx.layout?.state().narrow ?? false)
      const run = (action: NavAction) => {
        host.run(action)
        closeDrawer(ctx)
      }
      const top = derive(() => host.actions.get().filter(action => action.place !== 'footer'))
      const footer = derive(() => host.actions.get().filter(action => action.place === 'footer'))
      return div(
        { class: () => ['flex h-full min-h-0 flex-col gap-1 bg-neutral-950 py-3', narrow.get() ? 'w-full items-stretch px-2' : 'w-16 items-center'] },
        div({ class: () => ['mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-accent-400', narrow.get() ? 'ml-2' : ''] }, icon('logo', 16)),
        list(top, action => action.id, action => actionButton(action, narrow, run, host.busy), div({ class: 'contents' })),
        separator(narrow),
        list(entries, entry => entry.key, entry => itemButton(entry, narrow, drag), div({ class: () => ['flex min-h-0 w-full flex-1 flex-col gap-1 overflow-auto scrollbar-none', narrow.get() ? 'items-stretch' : 'items-center'] })),
        list(footer, action => action.id, action => actionButton(action, narrow, run, host.busy), div({ class: 'contents' })),
      )
    }

    ctx.provide('nav', host.nav)
    ctx.watch('nav', nav => (nav === host.nav ? place(ctx, 'side', view) : undefined))
  },
})
