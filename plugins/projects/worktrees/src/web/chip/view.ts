import { contextMenu, derive, div, dynamicChild, event, icon, plainButton, popover, show, sig, SPACE, span, untrack, type Pulse } from '@sand/dom'
import type { WebContext, WorktreeClient } from '../client'
import type { States } from '../states'
import type { Choices } from './choices'
import { entryMenu } from './entry-menu'
import { draftMenu, type EntryMenus } from './menu'
import { chipLabel, chipTarget } from './target'

export const createChip = (ctx: WebContext, client: WorktreeClient, states: States, choices: Choices, changes: Pulse) => {
  const open = sig(false)
  const close = () => open.set(false)
  const target = changes.read(() => {
    states.version.get()
    return chipTarget(ctx, states, choices)
  })
  const label = derive(() => chipLabel(target.get()))
  const hidden = derive(() => !target.get().state || !target.get().draft)

  const toggle = () => {
    if (open.get()) return close()
    const { cwd, device } = untrack(() => target.get())
    void states.refresh(cwd, device)
    open.set(true)
  }

  const title = () => (target.get().state?.worktree ? `This thread works in ${target.get().state?.root}` : 'Choose where this thread works')

  const chip = () =>
    plainButton(
      {
        title,
        class: [
          'inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-2 text-xs transition-colors hover:bg-neutral-800 hover:text-neutral-200',
          () => (open.get() ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500'),
        ],
        onMouseDown: event(toggle, { stop: true, prevent: true }),
        onClick: (click: MouseEvent) => {
          if (click.detail === 0) toggle()
        },
      },
      span({ class: 'inline-flex shrink-0' }, icon(label.get().glyph, 12)),
      span({ class: 'min-w-0 truncate py-1 text-middle' }, () => label.get().text),
      span({ class: 'inline-flex shrink-0' }, icon('down', 12)),
    )

  const context = contextMenu()
  const menus: EntryMenus = { context, spec: (entry, use) => entryMenu(ctx, client, entry, target.get().device, use) }
  const items = () => draftMenu(ctx, choices, target.get(), close, menus)

  const pill = () =>
    div(
      { class: 'flex min-w-0 items-center', hidden },
      context.view(),
      dynamicChild(derive(() => label.get().glyph), chip),
      show(open, () =>
        popover(
          close,
          { class: 'right-0 bottom-full mb-3 w-80 max-w-full overflow-auto', style: { maxHeight: `calc(100vh - ${SPACE['32']})` } },
          dynamicChild(derive(() => changes.version.get() + states.version.get()), items),
        ),
      ),
    )

  return { pill }
}
