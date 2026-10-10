import { button, derive, div, dynamicChild, focusable, icon, popover, show, sig, SPACE, span, untrack, type Pulse } from '@sand/dom'
import type { WebContext } from '../client'
import type { States } from '../states'
import type { Choices } from './choices'
import { draftMenu } from './menu'
import { chipLabel, chipTarget } from './target'

const look = 'inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-2 text-xs transition-colors ' + focusable

const above = {
  right: '0',
  bottom: '100%',
  width: `min(${SPACE['80']}, 100%)`,
  maxHeight: `calc(100vh - ${SPACE['32']})`,
}

const press = (action: () => void) => ({
  onMouseDown: (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    action()
  },
  onClick: (event: MouseEvent) => {
    if (event.detail === 0) action()
  },
})

export const createChip = (ctx: WebContext, states: States, choices: Choices, changes: Pulse) => {
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
    button(
      { type: 'button', title, class: [look, 'hover:bg-neutral-800 hover:text-neutral-200', () => (open.get() ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500')], ...press(toggle) },
      span({ class: 'inline-flex shrink-0' }, icon(label.get().glyph, 12)),
      span({ class: 'min-w-0 truncate py-1 text-middle' }, () => label.get().text),
      span({ class: 'inline-flex shrink-0' }, icon('down', 12)),
    )

  const items = () => draftMenu(ctx, choices, target.get(), close)

  const pill = () =>
    div(
      { class: 'flex min-w-0 items-center', hidden },
      dynamicChild(derive(() => label.get().glyph), chip),
      show(open, () => popover(close, { class: 'mb-3 overflow-auto', style: above }, dynamicChild(derive(() => changes.version.get() + states.version.get()), items))),
    )

  return { pill }
}
