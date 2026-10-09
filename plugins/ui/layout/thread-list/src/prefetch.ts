import type { Threads } from '@sand/protocol'

const limit = 2

export const prefetcher = (threads: Threads) => {
  let active = 0
  return (id: string) => {
    const thread = threads.get(id)
    if (!thread || thread.loaded || thread.failed || active >= limit) return
    active++
    void threads.load(id).finally(() => active--)
  }
}
