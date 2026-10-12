import type { Picked } from './integrations/selection'

const margin = 8
const gap = 10
const handles = 32
const height = 32

export const fallbackWidth = 148

export interface Spot {
  left: number
  top: number
  under: boolean
}

export const spotFor = (picked: Picked, touch: boolean, view: { width: number; height: number }, width: number): Spot => {
  const left = Math.max(Math.min(picked.x - 18, view.width - width - margin), margin)
  const above = picked.top - gap - height
  const below = picked.bottom + (touch ? handles : gap)
  const under = touch ? below + height < view.height - margin : above < margin
  return { left, top: under ? below : above, under }
}
