import { retryDelay } from './backoff'

export const createRetry = (run: () => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let at: number | undefined
  let failures = 0

  const clear = () => {
    clearTimeout(timer)
    timer = undefined
    at = undefined
  }

  return {
    at: () => at,
    failures: () => failures,
    pending: () => timer !== undefined,
    reset() {
      failures = 0
    },
    clear,
    schedule() {
      clear()
      const delay = retryDelay(failures++)
      at = Date.now() + delay
      timer = setTimeout(() => {
        timer = undefined
        at = undefined
        run()
      }, delay)
    },
  }
}
