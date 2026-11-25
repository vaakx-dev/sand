import { sig } from '@vaakx-dev/vrui'
import { atEnd, nearEnd, shiftBy, toEnd } from './end'
import { rowSizes } from './sizes'

export const followEnd = (scroller: HTMLElement) => {
  const away = sig(false)
  let pinned = true
  let top = 0

  const settle = (value: boolean) => {
    pinned = value
    top = scroller.scrollTop
    away.set(!value)
  }

  const following = () => {
    const now = scroller.scrollTop
    if (atEnd(scroller)) return true
    if (now < top) return false
    return pinned || (now > top && nearEnd(scroller))
  }

  const resized = (shift: number) => {
    if (pinned) toEnd(scroller)
    else shiftBy(scroller, shift)
    settle(pinned)
  }

  return {
    away,
    pinned: () => pinned,
    watch: rowSizes(scroller, resized),
    scrolled: () => settle(following()),
    moved: () => settle(pinned),
    restore() {
      if (!pinned) scroller.scrollTop = top
    },
    toEnd() {
      toEnd(scroller)
      settle(true)
    },
  }
}
