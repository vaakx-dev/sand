import { listen, media, untrack } from '@vaakx-dev/vrui'
import type { TooltipModel } from './model'

const element = (target: EventTarget | null) => (target instanceof Element ? target : null)

export const followEvents = (model: TooltipModel) => {
  const hovers = media('(any-hover: hover)')
  const pointer = ({ pointerType, clientX, clientY }: PointerEvent) =>
    pointerType === 'touch' || !untrack(() => hovers.get()) ? undefined : { x: clientX, y: clientY }
  let typing = false
  let last: { x: number; y: number } | undefined
  let still: Element | undefined
  const moved = (at: { x: number; y: number }) => at.x !== last?.x || at.y !== last.y
  listen<PointerEvent>(document, 'pointerover', event => {
    const target = element(event.target)
    const at = pointer(event)
    if (!target || !at) return
    still = moved(at) ? undefined : target
    if (!still) model.over(target, at)
  })
  listen<PointerEvent>(
    document,
    'pointermove',
    event => {
      const at = pointer(event)
      if (!at) return
      last = at
      if (still) model.over(still, at)
      else model.track(at)
      still = undefined
    },
    { passive: true },
  )
  listen<PointerEvent>(document, 'pointerout', event => model.out(event.relatedTarget))
  listen<PointerEvent>(
    document,
    'pointerdown',
    event => {
      typing = false
      if (!pointer(event)) model.track(undefined)
      model.press(element(event.target))
    },
    true,
  )
  listen(document, 'focusin', event => {
    const target = element(event.target)
    if (target && typing) model.focus(target)
  })
  listen(document, 'focusout', event => model.blur(event.target))
  listen(document, 'keydown', () => (typing = true), true)
  listen<KeyboardEvent>(document, 'keydown', ({ key, target }) => {
    if (key === 'Escape') model.escape()
    else if (key === 'Enter' || key === ' ') model.activate(target)
  })
  listen(document, 'scroll', event => model.scrolled(event.target), { capture: true, passive: true })
  listen(window, 'blur', model.close)
}
