export const createTracker = () => {
  let turning = false
  let settle: (() => void) | undefined

  return {
    turnStarted() {
      turning = true
    },
    turnEnded() {
      turning = false
      settle?.()
      settle = undefined
    },
    settled(signal: AbortSignal) {
      if (!turning || signal.aborted) return Promise.resolve()
      return new Promise<void>(resolve => {
        settle = resolve
        signal.addEventListener('abort', () => resolve(), { once: true })
      })
    },
  }
}
