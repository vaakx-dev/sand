import type { AskAnswer } from '@sand/protocol'

interface Wait {
  session: string
  settle(answers: AskAnswer[] | null): void
  fail(error: Error): void
}

export const createWaiting = () => {
  const waits = new Map<string, Wait>()

  const wait = (call: string, session: string, signal: AbortSignal) =>
    new Promise<AskAnswer[] | null>((resolve, reject) => {
      const done = () => {
        waits.delete(call)
        signal.removeEventListener('abort', abort)
      }
      const abort = () => {
        done()
        reject(signal.reason)
      }
      signal.addEventListener('abort', abort, { once: true })
      waits.set(call, {
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

  const answer = (session: string, call: string, answers: AskAnswer[] | null) => {
    const found = waits.get(call)
    if (!found || found.session !== session) throw new Error('This question was already answered or the turn has ended')
    found.settle(answers)
    return true
  }

  const close = () => [...waits.values()].forEach(entry => entry.fail(new Error('The questions were closed before the user answered')))

  return { wait, answer, close }
}

export type Waiting = ReturnType<typeof createWaiting>
