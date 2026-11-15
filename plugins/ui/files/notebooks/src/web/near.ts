import { div, intersectionObserver, show, sig } from '@vaakx-dev/vrui'

const MARGIN = '1200px 0px'

const scrolls = (element: Element) => /auto|scroll/.test(getComputedStyle(element).overflowY)

const scrollRoot = (element: Element): Element | null => {
  const parent = element.parentElement
  if (!parent) return null
  return scrolls(parent) ? parent : scrollRoot(parent)
}

const nearView = (render: () => Node, estimatePx: number) => {
  const near = sig(false)
  const heightPx = sig(estimatePx)
  const watch = (element: Element) => {
    intersectionObserver(
      element,
      entries => {
        const entry = entries.at(-1)
        if (!entry) return
        if (near.get() && !entry.isIntersecting) heightPx.set(entry.boundingClientRect.height)
        near.set(entry.isIntersecting)
      },
      { root: scrollRoot(element), rootMargin: MARGIN },
    )
  }
  return div({ class: 'min-w-0', style: () => (near.get() ? null : { minHeight: `${heightPx.get()}px` }), onMount: watch }, show(near, render))
}

export { nearView }
