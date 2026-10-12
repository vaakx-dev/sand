import { derive, div, dynamicChild, intersectionObserver, sig } from '@vaakx-dev/vrui'

const margin = '1500px 0px'

export interface LazyBody {
  key: () => string
  closed: () => boolean
  guess: () => number
  draw: () => HTMLElement
  scroller: () => HTMLElement
}

export const lazyDiff = ({ key, closed, guess, draw, scroller }: LazyBody) => {
  const near = sig(false)
  let drawn: HTMLElement | undefined
  let measured: { key: string; height: number } | undefined

  const remember = () => {
    if (drawn?.isConnected) measured = { key: key(), height: drawn.offsetHeight }
  }

  const changed: IntersectionObserverCallback = records => {
    const next = records.at(-1)?.isIntersecting ?? false
    if (next === near.get()) return
    if (!next) remember()
    near.set(next)
  }

  const height = () => (measured?.key === key() ? measured.height : guess())

  const body = () => {
    if (closed()) return null
    if (!near.get()) return div({ style: { height: `${height()}px` } })
    drawn = draw()
    return drawn
  }

  return div(
    { onMount: node => void intersectionObserver(node, changed, { root: scroller(), rootMargin: margin }) },
    dynamicChild(
      derive(() => `${closed()}|${near.get()}|${key()}`),
      body,
    ),
  )
}
