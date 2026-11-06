import type { ConversationRef } from '@sand/engine/contract'

const keyOf = ({ owner, id }: ConversationRef, thread: string) => `${owner}\n${id}\n${thread}`

export const createWaits = () => {
  const counts = new Map<string, number>()

  return {
    has: (by: ConversationRef, thread: string) => counts.has(keyOf(by, thread)),
    async during<T>(by: ConversationRef, thread: string, work: () => Promise<T>): Promise<T> {
      const key = keyOf(by, thread)
      counts.set(key, (counts.get(key) ?? 0) + 1)
      try {
        return await work()
      } finally {
        const left = counts.get(key)! - 1
        if (left) counts.set(key, left)
        else counts.delete(key)
      }
    },
  }
}

export type Waits = ReturnType<typeof createWaits>
