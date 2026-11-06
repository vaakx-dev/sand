import type { Box, Eye, Point } from './seed'

export const round = (value: number) => Math.round(value * 100) / 100

export const points = (list: readonly Point[]) => list.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')

const polygon = (list: readonly Point[]) => `M${points(list)}Z`

const boxCorners: Record<Box, (top: number, bottom: number) => Point[]> = {
  visor: (t, b) => [[15, t], [85, t], [94, t + 9], [94, b - 9], [85, b], [15, b], [6, b - 9], [6, t + 9]],
  chevron: (t, b) => [[-2, t - 3], [50, t + 6], [102, t - 3], [102, b], [50, b + 7], [-2, b]],
  trap: (t, b) => [[-2, t], [102, t], [90, b], [10, b]],
  goggles: (t, b) => [[3, t], [45, t], [45, t + 11], [55, t + 11], [55, t], [97, t], [97, b], [57, b], [57, b - 13], [43, b - 13], [43, b], [3, b]],
  slash: (t, b) => [[12, t - 2], [104, t - 2], [88, b + 2], [-4, b + 2]],
  step: (t, b) => [[-2, t + 7], [42, t + 7], [49, t], [102, t], [102, b - 7], [58, b - 7], [51, b], [-2, b]],
  hex: (t, b) => [[15, t], [85, t], [100, (t + b) / 2], [85, b], [15, b], [0, (t + b) / 2]],
  tab: (t, b) => [[-2, t], [102, t], [102, b], [61, b], [54, b + 9], [46, b + 9], [39, b], [-2, b]],
}

export const boxPath = (box: Box, top: number, bottom: number) => polygon(boxCorners[box](top, bottom))

export const eyePath = (eye: Exclude<Eye, 'cat'>, cx: number, cy: number, rx: number, ry: number) => {
  if (eye === 'round') {
    const r = round(Math.min(rx, ry))
    const tall = round(ry * 1.05)
    return `M${round(cx - r)},${round(cy)} A${r},${tall} 0 1 1 ${round(cx + r)},${round(cy)} A${r},${tall} 0 1 1 ${round(cx - r)},${round(cy)}Z`
  }
  if (eye === 'cut') {
    const half = rx * 0.5
    const lift = ry * 0.95
    return polygon([[cx - rx, cy], [cx - half, cy - lift], [cx + half, cy - lift], [cx + rx, cy], [cx + half, cy + lift], [cx - half, cy + lift]])
  }
  return `M${round(cx - rx)},${round(cy)} Q${round(cx)},${round(cy - 2 * ry)} ${round(cx + rx)},${round(cy)} Q${round(cx)},${round(cy + 2 * ry)} ${round(cx - rx)},${round(cy)}Z`
}

const radians = (degrees: number) => (degrees * Math.PI) / 180

const toward = (cx: number, cy: number, angle: number, distance: number): Point => [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance]

export const spike = (cx: number, cy: number, degrees: number, inner: number, outer: number, spread: number) => {
  const angle = radians(degrees)
  const half = radians(spread)
  return polygon([toward(cx, cy, angle - half, inner), toward(cx, cy, angle, outer), toward(cx, cy, angle + half, inner)])
}
