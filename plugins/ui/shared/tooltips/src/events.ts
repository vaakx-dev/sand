import { listen } from '@sand/dom'
import type { TooltipModel } from './model'

const element = (target: EventTarget | null) => (target instanceof Element ? target : null)

const pointer = ({ pointerType, clientX, clientY }: PointerEvent) => (pointerType === 'touch' ? undefined : { x: clientX, y: clientY })

export const followEvents = (model: TooltipModel) => {
  listen<PointerEvent>(document, 'pointerover', event => {
    const target = element(event.target)
    const at = pointer(event)
    if (target && at) model.over(target, at)
  })
  listen<PointerEvent>(
    document,
    'pointermove',
    event => {
      const at = pointer(event)
      if (at) model.track(at)
    },
    { passive: true },
  )
  listen<PointerEvent>(document, 'pointerout', event => model.out(event.relatedTarget))
  listen(document, 'pointerdown', event => model.press(element(event.target)), true)
  listen(document, 'focusin', event => {
    const target = element(event.target)
    if (target) model.focus(target)
  })
  listen(document, 'focusout', event => model.blur(event.target))
  listen<KeyboardEvent>(document, 'keydown', ({ key, target }) => {
    if (key === 'Escape') model.escape()
    else if (key === 'Enter' || key === ' ') model.activate(target)
  })
  listen(document, 'scroll', event => model.scrolled(event.target), { capture: true, passive: true })
  listen(window, 'blur', model.close)
}
