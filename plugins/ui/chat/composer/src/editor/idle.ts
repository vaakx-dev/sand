import { onTimeout } from '@vaakx-dev/vrui'

const IDLE_TIMEOUT_MS = 2000
const FALLBACK_DELAY_MS = 1000

export const onIdle = (run: () => void) => {
  if (typeof requestIdleCallback !== 'function') return onTimeout(run, FALLBACK_DELAY_MS)
  const handle = requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
  return () => cancelIdleCallback(handle)
}
