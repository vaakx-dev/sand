import { after } from '../detached'

const backoff = (failures: number) => Math.min(30_000, 1000 * 2 ** failures) * (0.5 + Math.random() * 0.5)

export const createRetry = (run: () => void) => {
  let cancel: (() => void) | undefined
  let at: number | undefined
  let failures = 0

  const clear = () => {
    cancel?.()
    cancel = undefined
    at = undefined
  }

  return {
    at: () => at,
    failures: () => failures,
    pending: () => cancel !== undefined,
    reset() {
      failures = 0
    },
    clear,
    schedule() {
      clear()
      const delay = backoff(failures++)
      at = Date.now() + delay
      cancel = after(delay, () => {
        cancel = undefined
        at = undefined
        run()
      })
    },
  }
}
