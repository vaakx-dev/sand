import type { Picked } from './integrations/selection'

const margin = 8
const gap = 10
const handles = 32
const size = { width: 88, height: 32 }

export interface Spot {
  left: number
  top: number
  under: boolean
}

export const spotFor = (picked: Picked, touch: boolean, view: { width: number; height: number }): Spot => {
  const left = Math.min(Math.max(picked.x - 18, margin), view.width - size.width - margin)
  const above = picked.top - gap - size.height
  const below = picked.bottom + (touch ? handles : gap)
  const under = touch ? below + size.height < view.height - margin : above < margin
  return { left, top: under ? below : above, under }
}
