import type { SecretStatus } from './contract'

export type Outcome = { status: 'saved'; file: string } | { status: Exclude<SecretStatus, 'saved'> }

type Settle = (outcome: Outcome) => void

const timeout = 20 * 60_000

export const createWaits = () => {
  const pending = new Map<string, { session: string; settle: Settle }>()

  return {
    wait: (session: string, id: string, signal: AbortSignal) =>
      new Promise<Outcome>(resolve => {
        const settle: Settle = outcome => {
          pending.delete(id)
          clearTimeout(timer)
          signal.removeEventListener('abort', cancel)
          resolve(outcome)
        }
        const cancel = () => settle({ status: 'cancelled' })
        const timer = setTimeout(() => settle({ status: 'timed_out' }), timeout)
        signal.addEventListener('abort', cancel, { once: true })
        pending.set(id, { session, settle })
      }),
    waiting: (session: string, id: string) => pending.get(id)?.session === session,
    answer(session: string, id: string): Settle {
      const found = pending.get(id)
      if (found?.session !== session) throw new Error('This request is no longer waiting for an answer')
      return found.settle
    },
    cancel() {
      for (const { settle } of pending.values()) settle({ status: 'cancelled' })
    },
  }
}

export type Waits = ReturnType<typeof createWaits>
