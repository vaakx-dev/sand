import type { Threads } from '@sand/web-client/contract'

const limit = 2

const savingData = () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)

export const prefetcher = (threads: Threads) => {
  let active = 0
  return (id: string) => {
    const thread = threads.get(id)
    if (!thread || thread.loaded || thread.failed || active >= limit || savingData()) return
    active++
    void threads.load(id).finally(() => active--)
  }
}
