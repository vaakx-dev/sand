export const untilAborted = <T>(work: Promise<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) return Promise.reject(signal.reason)
  let abort = () => {}
  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
  })
  return Promise.race([work, aborted]).finally(() => signal.removeEventListener('abort', abort))
}
