import { div, intersectionObserver, onRaf, onTimeout } from '@vaakx-dev/vrui'

const ahead = '200% 0px 0px 0px'
const idleDelay = 400

export const topEdge = (grow: () => boolean, trim: () => void) => {
  const sentinel = div()
  let near = false
  let queued = false
  let stopIdle: (() => void) | undefined

  const pump = () => {
    if (queued || !near) return
    queued = true
    onRaf(() => {
      queued = false
      if (near && grow()) pump()
    }, sentinel)
  }

  const watch = (scroller: HTMLElement) =>
    intersectionObserver(
      sentinel,
      entries => {
        near = entries.at(-1)?.isIntersecting ?? false
        pump()
      },
      { root: scroller, rootMargin: ahead },
    )

  const scrolled = () => {
    stopIdle?.()
    stopIdle = onTimeout(
      () => {
        if (!near) trim()
      },
      idleDelay,
      sentinel,
    )
  }

  return { sentinel, watch, pump, scrolled }
}
