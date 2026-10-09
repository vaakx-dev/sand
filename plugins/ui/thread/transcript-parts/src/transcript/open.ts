import type { OpenStates } from '../contract'
import { derive, sig, type Sig } from '@sand/dom'

export const openStates = (): OpenStates => {
  const states = new Map<string, Sig<boolean | undefined>>()
  return {
    get(key, fallback = () => false) {
      let state = states.get(key)
      if (!state) states.set(key, (state = sig<boolean | undefined>(undefined)))
      const chosen = state
      const open = derive(() => chosen.get() ?? fallback())
      return { open, toggle: () => chosen.set(!open.get()) }
    },
  }
}
