import { type MergeMethod, type PullRef, pullKey } from '@sand/github/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'

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

const keyOf = (session: string, pull: PullRef) => `${session}\u0000${pullKey(pull)}`

export const detailStates = () => {
  const states = new Map<string, DetailState>()
  return {
    of(session: string, pull: PullRef) {
      const key = keyOf(session, pull)
      const found = states.get(key)
      if (found) return found
      const made = detailState()
      states.set(key, made)
      return made
    },
    keep(session: string | undefined, pulls: PullRef[]) {
      const shown = new Set(session === undefined ? [] : pulls.map(pull => keyOf(session, pull)))
      for (const key of states.keys()) if (!shown.has(key)) states.delete(key)
    },
  }
}

export type DetailStates = ReturnType<typeof detailStates>
