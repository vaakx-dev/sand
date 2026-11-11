import { sig } from '@vaakx-dev/vrui'
import { nearEnd, toEnd } from './end'
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

  return {
    away,
    pinned: () => pinned,
    watch: rowSizes(scroller, () => pinned),
    scrolled() {
      const now = scroller.scrollTop
      if (nearEnd(scroller)) settle(true)
      else settle(pinned && now >= top)
    },
    measure: () => settle(nearEnd(scroller)),
    restore() {
      if (!pinned) scroller.scrollTop = top
    },
    toEnd() {
      toEnd(scroller)
      settle(true)
    },
  }
}
