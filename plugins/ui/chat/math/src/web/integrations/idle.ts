const IDLE_TIMEOUT_MS = 2000
const FALLBACK_DELAY_MS = 1000

export const onIdle = (run: () => void) => {
  if (typeof requestIdleCallback !== 'function') {
    const timer = setTimeout(run, FALLBACK_DELAY_MS)
    return () => clearTimeout(timer)
  }
  const handle = requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
  return () => cancelIdleCallback(handle)
}
