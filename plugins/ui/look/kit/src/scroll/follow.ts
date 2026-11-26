import { sig } from '@vaakx-dev/vrui'
import { anchorOf, atEnd, nearEnd, shiftBy, toAnchor, toEnd, type Anchor } from './end'
import { scrollIntent } from './intent'
import { rowSizes } from './sizes'

export const followEnd = (scroller: HTMLElement, rowList: HTMLElement) => {
  const away = sig(false)
  const intent = scrollIntent(scroller)
  let pinned = true
  let top = 0
  let anchor: Anchor | undefined
  let paused = false

  const settle = (value: boolean) => {
    if (paused) return
    pinned = value
    top = scroller.scrollTop
    anchor = value ? undefined : anchorOf(scroller, rowList)
    away.set(!value)
  }

  const keep = (value: boolean, shift = 0) => {
    if (value) toEnd(scroller)
    else shiftBy(scroller, shift)
    settle(value)
  }

  const following = () => {
    const now = scroller.scrollTop
    if (atEnd(scroller)) return true
    if (!intent.active()) return pinned
    if (now < top) return false
    return pinned || (now > top && nearEnd(scroller))
  }

  const backToPlace = () => {
    if (pinned || !anchor?.row.isConnected) return keep(true)
    toAnchor(scroller, anchor)
    settle(false)
  }

  return {
    away,
    pinned: () => pinned,
    watch: rowSizes(scroller, shift => keep(pinned, shift)),
    scrolled: () => keep(following()),
    moved: () => settle(pinned),
    intend: intent.mark,
    toEnd: () => keep(true),
    pause() {
      paused = true
    },
    resume() {
      paused = false
      backToPlace()
    },
  }
}
