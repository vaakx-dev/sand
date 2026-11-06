export const createWaits = () => {
  const counts = new Map<string, number>()
  const keyOf = (bot: string, thread: string) => `${bot}\n${thread}`

  return {
    has: (bot: string, thread: string) => counts.has(keyOf(bot, thread)),
    async during<T>(bot: string, thread: string, work: () => Promise<T>): Promise<T> {
      const key = keyOf(bot, thread)
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
