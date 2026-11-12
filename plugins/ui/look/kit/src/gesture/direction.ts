import type { Way } from '@sand/ui-shell/contract'

const lockDistance = 10

export type Direction = Way | 'undecided'

const vertical = (dy: number): Way => (dy < 0 ? 'up' : 'down')

const sideways = (dx: number): Way => (dx < 0 ? 'left' : 'right')

export const direction = (dx: number, dy: number): Direction => {
  const across = Math.abs(dx)
  const down = Math.abs(dy)
  if (down > lockDistance && down > across) return vertical(dy)
  if (across < lockDistance) return 'undecided'
  return sideways(dx)
}

export const alongWay = (way: Way, dx: number, dy: number) => (way === 'left' || way === 'right' ? dx : dy)
