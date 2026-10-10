import type { Entry } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import type { DescribeSettings, ItemCache } from '../contract'
import { liveItems } from './items'
import { settledItems, type Settled } from './settled'

interface Key {
  thread: Thread
  entries: Thread['entries']
  size: number
  head: string | null
  tools: Thread['tools']
  running: string
  results: number
}

const keyOf = (thread: Thread): Key => ({
  thread,
  entries: thread.entries,
  size: thread.entries.size,
  head: thread.info.head,
  tools: thread.tools,
  running: [...thread.tools.running].join('\n'),
  results: thread.tools.results.size,
})

const sameKey = (a: Key, b: Key) => (Object.keys(a) as (keyof Key)[]).every(field => a[field] === b[field])

export const itemCache = (): ItemCache => {
  let cached: { key: Key; settled: Settled } | undefined
  return {
    items(thread: Thread, path: () => Entry[], custom: (type: string) => boolean, describe?: DescribeSettings) {
      const key = keyOf(thread)
      if (!cached || !sameKey(cached.key, key)) cached = { key, settled: settledItems(thread, path(), custom, describe) }
      return liveItems(cached.settled, thread)
    },
    reset() {
      cached = undefined
    },
  }
}
