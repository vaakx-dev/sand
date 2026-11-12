import type { Way } from '@sand/ui-shell/contract'

const SYSTEM_EDGE = 24

export const fromSystemEdge = (way: Way, x: number, y: number) => {
  switch (way) {
    case 'left':
      return x > innerWidth - SYSTEM_EDGE
    case 'up':
      return y > innerHeight - SYSTEM_EDGE
    default:
      return false
  }
}
