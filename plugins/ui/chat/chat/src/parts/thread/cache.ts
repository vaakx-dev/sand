import type { Thread } from '@sand/web-client/contract'
import type { ItemCache } from '../contract'
import { liveItems } from './items'
import { settledItems, type Settled } from './settled'

const keyOf = (thread: Thread): unknown[] => [
  thread,
  thread.entries,
  thread.entries.size,
  thread.info.head,
  thread.tools,
  [...thread.tools.running].join('\n'),
  thread.tools.results.size,
]

const sameKey = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((value, index) => value === b[index])

export const itemCache = (): ItemCache => {
  let cached: { key: unknown[]; settled: Settled } | undefined
  return {
    items(thread, path, custom, describe) {
      const key = keyOf(thread)
      if (!cached || !sameKey(cached.key, key)) cached = { key, settled: settledItems(thread, path(), custom, describe) }
      return liveItems(cached.settled, thread)
    },
    reset() {
      cached = undefined
    },
  }
}
