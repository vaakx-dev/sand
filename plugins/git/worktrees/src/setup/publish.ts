import { pathKey } from '@sand/git/contract'
import type { WorktreeSetup } from '../contract'
import type { WorktreeRecord } from '../records/schema'
import { shownSetup } from './state'

const outputEveryMs = 300

export const createPublisher = (send: (setup: WorktreeSetup) => void) => {
  const pending = new Map<string, Timer>()

  const now = (record: WorktreeRecord) => {
    if (record.setup) send(shownSetup(record.setup))
  }

  return {
    now,
    soon(record: WorktreeRecord) {
      const key = pathKey(record.path)
      if (pending.has(key)) return
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key)
          now(record)
        }, outputEveryMs),
      )
    },
    cancel(record: WorktreeRecord) {
      const key = pathKey(record.path)
      clearTimeout(pending.get(key))
      pending.delete(key)
    },
    close() {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    },
  }
}
