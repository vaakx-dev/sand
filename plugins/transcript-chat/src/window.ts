import type { Item } from '@sand/conversation'
import type { ThreadView } from './view'

export const pageSize = 40

export const windowed = (view: ThreadView, items: Item[], grow = 0) => {
  const anchored = view.first ? items.findIndex(item => item.key === view.first) : -1
  const start = Math.max(0, (anchored >= 0 ? anchored : items.length - pageSize) - grow)
  view.first = items[start]?.key
  view.truncated = start > 0
  view.size = items.length - start
  return items.slice(start)
}
