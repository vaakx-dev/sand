import type { MergeMethod, PullRef } from '@sand/github/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import { pullKey } from '../links/rank'

export interface DetailState {
  method: Sig<MergeMethod>
  confirming: Sig<boolean>
  busy: Sig<boolean>
  run(work: () => Promise<unknown>): Promise<void>
}

const detailState = (): DetailState => {
  const busy = sig(false)
  return {
    method: sig<MergeMethod>('squash'),
    confirming: sig(false),
    busy,
    async run(work) {
      if (busy.get()) return
      busy.set(true)
      try {
        await work()
      } finally {
        busy.set(false)
      }
    },
  }
}

export const detailStates = () => {
  const states = new Map<string, DetailState>()
  return {
    of(session: string, pull: PullRef) {
      const key = `${session}\u0000${pullKey(pull)}`
      const found = states.get(key)
      if (found) return found
      const made = detailState()
      states.set(key, made)
      return made
    },
  }
}

export type DetailStates = ReturnType<typeof detailStates>
