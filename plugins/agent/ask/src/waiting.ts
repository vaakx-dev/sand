import type { AskAnswer } from './contract'

interface Wait {
  session: string
  settle(answers: AskAnswer[] | null): void
  fail(error: Error): void
}

export const createWaiting = () => {
  const waits = new Map<string, Wait>()

  const wait = (id: string, session: string, signal?: AbortSignal) =>
    new Promise<AskAnswer[] | null>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason)
      const done = () => {
        waits.delete(id)
        signal?.removeEventListener('abort', abort)
      }
      const abort = () => {
        done()
        reject(signal?.reason)
      }
      signal?.addEventListener('abort', abort, { once: true })
      waits.set(id, {
        session,
        settle(answers) {
          done()
          resolve(answers)
        },
        fail(error) {
          done()
          reject(error)
        },
      })
    })

  const answer = (session: string, id: string, answers: AskAnswer[] | null) => {
    const found = waits.get(id)
    if (!found || found.session !== session) throw new Error('This question was already answered or the turn has ended')
    found.settle(answers)
    return true
  }

  const close = (ids: Iterable<string> = waits.keys()) => {
    const error = new Error('The questions were closed before the user answered')
    for (const id of [...ids]) waits.get(id)?.fail(error)
  }

  return { wait, answer, close }
}

export type Waiting = ReturnType<typeof createWaiting>
