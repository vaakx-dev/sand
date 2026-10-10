import { onInterval, sig } from '@sand/dom'

export const ticker = () => {
  const now = sig(Date.now())
  let stop: (() => void) | undefined
  const set = (active: boolean) => {
    now.set(Date.now())
    if (active && !stop) stop = onInterval(() => now.set(Date.now()), 1000)
    if (!active && stop) {
      stop()
      stop = undefined
    }
  }
  return { now, set, dispose: () => stop?.() }
}
