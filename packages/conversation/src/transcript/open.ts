import { derive, sig, type Sig } from '@sand/dom'

export interface OpenState {
  open: Sig<boolean>
  toggle(): void
}

export interface OpenStates {
  get(key: string, fallback?: () => boolean): OpenState
}

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
