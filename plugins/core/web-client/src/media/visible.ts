const margin = '800px'

export const createVisibility = () => {
  const waiting = new WeakMap<Element, () => void>()
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        const run = waiting.get(entry.target)
        waiting.delete(entry.target)
        run?.()
      }
    },
    { rootMargin: margin, scrollMargin: margin } as IntersectionObserverInit,
  )

  return {
    when(element: Element, run: () => void) {
      waiting.set(element, run)
      observer.observe(element)
    },
    dispose: () => observer.disconnect(),
  }
}
