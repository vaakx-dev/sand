import type { ThreadView } from './view'

export const growStep = 10
export const fetchWithin = 3 * growStep
export const keptAtEnd = 40
export const trimAt = 2 * keptAtEnd

export const windowed = <T extends { key: string }>(view: ThreadView, items: T[], grow = 0) => {
  const anchored = view.first ? items.findIndex(item => item.key === view.first) : -1
  const fallback = items.length - (view.size || growStep)
  const start = Math.max(0, (anchored >= 0 ? anchored : fallback) - grow)
  view.first = items[start]?.key
  view.above = start
  view.size = items.length - start
  return items.slice(start)
}

export const resetToEnd = (view: ThreadView) => {
  view.first = undefined
  view.size = keptAtEnd
}
