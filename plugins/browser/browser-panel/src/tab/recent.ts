import { effect, onTimeout, sig, type Sig } from '@sand/dom'
import type { SeenAction } from './model'

export const recent = (action: Sig<SeenAction | undefined>, ms: number) => {
  const fresh = sig(false)
  effect(() => {
    const seen = action.get()?.seen
    const left = seen === undefined ? 0 : seen + ms - Date.now()
    fresh.set(left > 0)
    if (left > 0) return onTimeout(() => fresh.set(false), left)
  })
  return fresh
}
