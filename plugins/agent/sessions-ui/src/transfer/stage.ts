import type { Entry } from '@sand/messages'

const expiry = 15 * 60 * 1000

export const createStaging = () => {
  const staged = new Map<string, Entry[]>()
  const timers = new Map<string, Timer>()

  const drop = (transfer: string) => {
    clearTimeout(timers.get(transfer))
    timers.delete(transfer)
    staged.delete(transfer)
  }

  return {
    add(transfer: string, entries: Entry[]) {
      staged.set(transfer, [...(staged.get(transfer) ?? []), ...entries])
      clearTimeout(timers.get(transfer))
      timers.set(transfer, setTimeout(() => drop(transfer), expiry).unref())
    },
    take(transfer: string) {
      const entries = staged.get(transfer)
      drop(transfer)
      return entries
    },
    dispose() {
      for (const transfer of [...staged.keys()]) drop(transfer)
    },
  }
}

export type Staging = ReturnType<typeof createStaging>
