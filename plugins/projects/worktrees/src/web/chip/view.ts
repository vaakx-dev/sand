import { button, derive, div, dynamicChild, focusable, icon, popover, show, sig, SPACE, span, untrack, type Pulse } from '@sand/dom'
import type { WebContext } from '../client'
import type { States } from '../states'
import type { Choices } from './choices'
import { draftMenu, threadMenu } from './menu'
import { chipLabel, chipTarget } from './target'

const look = 'inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-2 text-xs transition-colors ' + focusable

const above = {
  right: '0',
  bottom: '100%',
  width: `min(${SPACE['80']}, calc(100vw - ${SPACE['12']}))`,
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

export const createChip = (ctx: WebContext, states: States, choices: Choices, changes: Pulse, openMove: () => void) => {
  const open = sig(false)
  const close = () => open.set(false)
  const target = changes.read(() => {
    states.version.get()
    return chipTarget(ctx, states, choices)
  })
  const label = derive(() => chipLabel(target.get()))
  const movable = derive(() => Boolean(target.get().thread && target.get().state && !target.get().state?.worktree))
  const menu = derive(() => Boolean(target.get().draft) || movable.get())
  const hidden = derive(() => !target.get().state)

  const toggle = () => {
    if (!menu.get()) return
    if (open.get()) return close()
    const { cwd, device } = untrack(() => target.get())
    void states.refresh(cwd, device)
    open.set(true)
  }

  const title = () => {
    const { state, thread } = target.get()
    if (!state) return ''
    if (state.worktree) return `This thread works in ${state.root}`
    return thread ? 'This thread works in the project folder. Move it to its own worktree' : 'Choose where this thread works'
  }

  const chip = () =>
    button(
      { type: 'button', title, class: [look, () => (open.get() ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500'), () => (menu.get() ? 'hover:bg-neutral-800 hover:text-neutral-200' : 'cursor-default')], ...press(toggle) },
      span({ class: 'inline-flex shrink-0' }, icon(label.get().glyph, 12)),
      span({ class: 'min-w-0 truncate py-1 text-middle' }, () => label.get().text),
      show(menu, () => span({ class: 'inline-flex shrink-0' }, icon('down', 12))),
    )

  const items = () => (target.get().draft ? draftMenu(ctx, choices, target.get(), close) : threadMenu(openMove, close))

  const pill = () =>
    div(
      { class: 'relative flex min-w-0 items-center', hidden },
      dynamicChild(derive(() => label.get().glyph), chip),
      show(open, () => popover(close, { class: 'mb-3 overflow-auto', style: above }, dynamicChild(derive(() => changes.version.get() + states.version.get()), items))),
    )

  return { pill }
}
