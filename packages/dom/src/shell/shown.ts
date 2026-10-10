export interface Shown {
  get(): boolean
  stop(): void
}

export const watchShown = (node: Element, changed: (shown: boolean) => void): Shown => {
  let shown = false
  const observer = new IntersectionObserver(records => {
    const next = records.at(-1)?.isIntersecting ?? shown
    if (next === shown) return
    shown = next
    changed(shown)
  })
  observer.observe(node)
  return { get: () => shown, stop: () => observer.disconnect() }
}
