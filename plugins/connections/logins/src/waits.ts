export type Unanswered = 'declined' | 'timed_out' | 'cancelled'

export type Outcome<T> = { status: 'answered'; answer: T } | { status: Unanswered }

type Settle<T> = (outcome: Outcome<T>) => void

export const createWaits = <T>() => {
  const pending = new Map<string, { session: string; settle: Settle<T> }>()

  return {
    wait: (session: string, id: string, timeout: number, signal: AbortSignal) =>
      new Promise<Outcome<T>>(resolve => {
        const settle: Settle<T> = outcome => {
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
    answer(session: string, id: string): Settle<T> {
      const found = pending.get(id)
      if (found?.session !== session) throw new Error('This request is no longer waiting for an answer')
      return found.settle
    },
    cancel() {
      for (const { settle } of pending.values()) settle({ status: 'cancelled' })
    },
  }
}

export type Waits<T> = ReturnType<typeof createWaits<T>>

export type SecretAnswer = { save: boolean } & ({ value: string } | { username: string; password: string })

export type CodeAnswer = { code: string } | { approved: true }
