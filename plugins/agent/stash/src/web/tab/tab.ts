import { pressOpens } from '@sand/kit/web'
import { div, show, sig, span } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { Actions } from '../actions'
import type { Items } from '../items'
import { stashList } from './list'

export const createTab = (ctx: Context<'kit'>, items: Items, actions: Actions) => {
  const { contextMenu, dot, icon, plainButton, popover } = ctx.kit
  const opened = sig(false)
  const close = () => opened.set(false)
  const open = () => {
    if (!items.list.get().length) return
    items.see()
    opened.set(true)
  }
  const toggle = () => (opened.get() ? close() : open())
  const context = contextMenu()

  const view = () =>
    div(
      { class: 'relative flex' },
      context.view(),
      plainButton(
        { title: 'Stash', 'aria-label': 'Stash', class: 'relative inline-flex h-5 w-6 items-center justify-center', ...pressOpens(opened, toggle) },
        icon('stash', 12),
        show(items.fresh, () => span({ class: 'absolute top-px right-px inline-flex' }, dot('accent'))),
      ),
      show(opened, () => popover(close, { class: 'right-0 bottom-full mb-2 w-80' }, stashList(ctx, items, actions, context, close))),
    )

  return { view, open, toggle }
}
