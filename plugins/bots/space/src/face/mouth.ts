import { polyline } from '@vaakx-dev/vrui'
import { points } from './geometry'
import { white } from './palette'
import type { Pose } from './pose'
import { mouths, type Point, type Seed } from './seed'

const zigzag = (phase: number): Point[] => Array.from({ length: 11 }, (_, i) => [-9 + i * 1.8, ((i + phase) % 2 ? -1 : 1) * 0.9])

const alarmed: Point[] = [[-10, 0.5], [-7.5, -2.8], [-5, 2.8], [-2.5, -2.8], [0, 2.8], [2.5, -2.8], [5, 2.8], [7.5, -2.8], [10, 0.5]]

const shapes: Record<Exclude<Pose['mouth'], 'working'>, (seed: Seed) => readonly Point[]> = {
  idle: ({ mouth, personality }) => (personality === 'smug' ? mouths[mouth].map(([x, y]) => [x, y - x * 0.18]) : mouths[mouth]),
  happy: ({ mouth }) => mouths[mouth].map(([x, y]) => [x * 1.05, y * 1.4 - Math.abs(x) * 0.12]),
  needs: () => alarmed,
  sleep: () => [[-4, 0], [4, 0]],
}

const line = (shape: readonly Point[], y: number, full: boolean, motion?: { class: string; opacity: number }) =>
  polyline({
    points: points(shape.map(([px, py]) => [50 + px * 1.15, y + py * 1.1])),
    fill: 'none',
    stroke: white,
    strokeWidth: full ? 1.9 : 3.4,
    strokeLinejoin: 'miter',
    strokeLinecap: 'square',
    ...motion,
  })

export const mouth = (seed: Seed, pose: Pose, y: number, full: boolean) =>
  pose.mouth === 'working'
    ? [line(zigzag(0), y, full, { class: 'face-flip', opacity: 1 }), line(zigzag(1), y, full, { class: 'face-flop', opacity: 0 })]
    : [line(shapes[pose.mouth](seed), y, full)]
