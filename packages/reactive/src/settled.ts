import { onIdle, onTimeout } from '@vaakx-dev/vrui'

const firstScreenMs = 3000

export const whenSettled = (run: () => void) => {
  let stop = onTimeout(() => (stop = onIdle(run)), Math.max(0, firstScreenMs - performance.now()))
  return () => stop()
}
