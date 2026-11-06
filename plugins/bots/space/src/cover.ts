import { layout, type Layout } from '@sand/layout/contract'
import { nav } from '@sand/nav/contract'
import { running } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { collectScope, disposeAll, div, effect, mount, untrack } from '@vaakx-dev/vrui'
import type { BotsContext } from './context'
import type { Hosted } from './host'

export interface Covered {
  open(): boolean
  toggle(): void
  leave(): void
}

const cover = (ctx: BotsContext, found: Layout | undefined, views: Hosted, leave: () => void) => {
  const side = collectScope(() => views.side(leave))
  const main = collectScope(() => views.main(leave))
  const stops = found
    ? [found.cover('side', side.value), found.cover('main', main.value)]
    : [mount(document.body, div({ class: [ctx.kit.layer.drawer, 'fixed inset-0 flex bg-neutral-900'] }, side.value, main.value))]
  return () => {
    for (const stop of stops) void stop()
    disposeAll(side.scope)
    disposeAll(main.scope)
  }
}

const floatingButton = (ctx: BotsContext, toggle: () => void) => {
  const { icon, layer, secondaryAction } = ctx.kit
  return mount(document.body, secondaryAction({ size: 'sm', class: [layer.drawer, 'fixed bottom-3 left-3 opacity-75'], onClick: toggle }, icon('bot', 14), 'Bots'))
}

export const covered = (ctx: BotsContext, views: Hosted, { open, toggle, leave }: Covered) =>
  joinDisposers(
    ctx.watch(nav, found => (found ? found.action({ id: 'bots', label: 'Bots', icon: 'bot', order: 30, run: toggle }) : floatingButton(ctx, toggle))),
    ctx.watch(layout, found =>
      effect(() => {
        if (!open() || !running(ctx)) return
        return untrack(() => cover(ctx, found, views, leave))
      }),
    ),
  )
