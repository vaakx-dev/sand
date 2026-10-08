import type { PalettePage } from '@sand/protocol'
import { div, dynamicChild, errorMessage, overlay, sheet, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import type { PageMemory, PageNav } from './nav'
import { pageView } from './page'

export const paletteSheet = (ctx: Context, stack: Sig<PalettePage[]>, query: () => string) => {
  const held = new Set<PalettePage>()
  const memories = new WeakMap<PalettePage, PageMemory>()
  const top = () => stack.get().at(-1)
  const locked = () => {
    const page = top()
    return page !== undefined && held.has(page)
  }
  const close = (page?: PalettePage) => {
    if (!page || top() === page) stack.set([])
  }
  const dismiss = () => {
    if (!locked()) close()
  }
  const nav: PageNav = {
    trail: () => stack.get(),
    push: page => stack.set([...stack.get(), page]),
    back(to = stack.get().length - 2) {
      if (to >= 0 && !locked()) stack.set(stack.get().slice(0, to + 1))
    },
    close,
    dismiss,
    fail(error) {
      if (ctx.notify) ctx.notify.push(errorMessage(error), { level: 'error' })
      else console.error(error)
    },
    isTop: page => top() === page,
    hold(page) {
      held.add(page)
      return () => void held.delete(page)
    },
    memory(page) {
      const memory = memories.get(page) ?? {}
      memories.set(page, memory)
      return memory
    },
  }
  let opening = true
  const view = (pages: PalettePage[]) => {
    const page = pages.at(-1)
    if (!page) return div()
    const initial = opening ? query() : ''
    opening = false
    return pageView(page, nav, initial)
  }
  return overlay(dismiss, sheet({ 'aria-label': 'Command palette' }, dynamicChild(stack, view)))
}
