import { after } from '../detached'
import { retryDelay } from './backoff'

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
      const delay = retryDelay(failures++)
      at = Date.now() + delay
      cancel = after(delay, () => {
        cancel = undefined
        at = undefined
        run()
      })
    },
  }
}
