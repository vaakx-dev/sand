export interface Spot {
  top: number
  left: number
  above: boolean
}

const gap = 6
const edge = 8

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high))

export const spotFor = (bubble: Element, anchor: Element): Spot => {
  const target = anchor.getBoundingClientRect()
  const own = bubble.getBoundingClientRect()
  const above = target.top - gap - own.height >= edge
  return {
    top: above ? target.top - gap - own.height : clamp(target.bottom + gap, edge, innerHeight - edge - own.height),
    left: clamp(target.left + target.width / 2 - own.width / 2, edge, innerWidth - edge - own.width),
    above,
  }
}

export const elementAt = (point: { x: number; y: number }) => document.elementFromPoint(point.x, point.y)
