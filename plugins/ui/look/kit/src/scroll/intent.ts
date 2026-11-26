import { listen } from '@vaakx-dev/vrui'

const INTENT_MS = 500
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export const scrollIntent = (scroller: HTMLElement) => {
  let inputAt = -Infinity
  let holding = false

  const mark = () => {
    inputAt = performance.now()
  }

  const press = () => {
    holding = true
    mark()
  }

  const release = () => {
    if (!holding) return
    holding = false
    mark()
  }

  const scrollsHere = ({ key, target }: KeyboardEvent) =>
    SCROLL_KEYS.has(key) && (target === document.body || (target instanceof Node && scroller.contains(target)))

  listen(scroller, 'wheel', mark, { passive: true })
  listen(scroller, 'touchmove', mark, { passive: true })
  listen(scroller, 'pointerdown', press)
  listen(document, 'pointerup', release)
  listen(document, 'pointercancel', release)
  listen(document, 'keydown', (event: KeyboardEvent) => {
    if (scrollsHere(event)) mark()
  })

  return {
    active: () => holding || performance.now() - inputAt < INTENT_MS,
    mark,
  }
}
