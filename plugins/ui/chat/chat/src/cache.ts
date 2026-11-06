import type { Entry } from '@sand/chats/contract'
import type { Item, Settled, TranscriptParts } from '@sand/transcript/contract'
import type { Thread } from '@sand/web-client/contract'

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

export const itemCache = (parts: TranscriptParts) => {
  let cached: { key: unknown[]; settled: Settled } | undefined
  return {
    items(thread: Thread, path: () => Entry[]): Item[] {
      const key = keyOf(thread)
      if (!cached || !sameKey(cached.key, key)) cached = { key, settled: parts.settled(thread, path()) }
      return parts.items(cached.settled, thread)
    },
    reset() {
      cached = undefined
    },
  }
}
