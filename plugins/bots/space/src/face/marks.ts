import { g, path, rect } from '@vaakx-dev/vrui'
import { points } from './geometry'
import { alarm } from './palette'
import type { Pose } from './pose'

const x = 84
const y = 11

const dotDelays = ['0s', '-0.5s', '-0.25s']

const marks: Record<NonNullable<Pose['mark']>, (color: string) => SVGElement> = {
  bang: () =>
    g(
      {},
      path({ d: `M${x - 1.5},${y - 7} L${x + 4.5},${y - 7} L${x + 2},${y + 3} L${x},${y + 3}Z`, fill: alarm }),
      rect({ x: x - 0.8, y: y + 5, width: 3.8, height: 3.8, fill: alarm }),
    ),
  z: color =>
    g({ transform: `translate(${x - 4},${y + 1})` }, g({ class: 'face-drift' }, path({ d: 'M0,0 h6 l-6,7 h6', fill: 'none', stroke: color, strokeWidth: 2 }))),
  dots: color =>
    g(
      {},
      ...dotDelays.map((delay, i) =>
        rect({ x: x - 8 + i * 6, y, width: 3.6, height: 3.6, fill: color, opacity: i ? 0.3 : 1, class: 'face-dot', style: { animationDelay: delay } }),
      ),
    ),
  sparkle: color =>
    path({
      d: `M${points([[x, y - 5], [x + 1.2, y - 1.2], [x + 5, y], [x + 1.2, y + 1.2], [x, y + 5], [x - 1.2, y + 1.2], [x - 5, y], [x - 1.2, y - 1.2]])}Z`,
      fill: color,
      class: 'face-twinkle',
    }),
}

export const mark = (pose: Pose, color: string, full: boolean) => {
  if (!pose.mark || (!full && pose.mark !== 'bang')) return null
  return marks[pose.mark](color)
}
