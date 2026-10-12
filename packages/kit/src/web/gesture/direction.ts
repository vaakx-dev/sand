const lockDistance = 10

export type Direction = 'undecided' | 'vertical' | 'sideways'

export const direction = (dx: number, dy: number): Direction => {
  const across = Math.abs(dx)
  const down = Math.abs(dy)
  if (down > lockDistance && down > across) return 'vertical'
  if (across < lockDistance) return 'undecided'
  return 'sideways'
}
