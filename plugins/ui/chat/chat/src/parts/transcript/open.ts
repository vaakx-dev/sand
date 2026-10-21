import type { OpenStates } from '../contract'
import { sig, type Sig } from '@vaakx-dev/vrui'

export const openStates = (): OpenStates => {
  const states = new Map<string, Sig<boolean>>()
  return {
    get(key) {
      const open = states.get(key) ?? sig(false)
      states.set(key, open)
      return { open, toggle: open.toggle() }
    },
  }
}
