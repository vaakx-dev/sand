import { circle, g, path, svgEl } from '@vaakx-dev/vrui'
import { eyePath, points, round, spike } from './geometry'
import { alarm, ink, white, type Neon } from './palette'
import type { FaceState, Pose } from './pose'
import { ticks, type Point, type Reticle, type Seed } from './seed'

export interface EyeParts {
  seed: Seed
  colors: Neon
  pose: Pose
  state: FaceState
  full: boolean
  id: string
}

export type Side = -1 | 1

const lineStyle = { stroke: ink, strokeWidth: 0.9 }

const irisMotion: Partial<Record<FaceState, string>> = { working: 'face-look', needs: 'face-jitter' }

const reticles: Record<Reticle, (x: number, y: number, r: number, spinning: boolean) => SVGElement[]> = {
  x: (x, y, r) => {
    const d = r * 0.7
    return [path({ d: `M${round(x - d)},${round(y - d)} L${round(x + d)},${round(y + d)} M${round(x + d)},${round(y - d)} L${round(x - d)},${round(y + d)}`, ...lineStyle })]
  },
  segment: (x, y, r, spinning) => [
    circle({ cx: round(x), cy: round(y), r: round(r * 0.68), fill: 'none', stroke: ink, strokeWidth: 1.1, strokeDasharray: '2.1 1.5', class: spinning ? 'face-spin' : null }),
  ],
  slit: (x, y, r) => [
    path({ d: `M${round(x)},${round(y - r)} L${round(x)},${round(y + r)}`, stroke: ink, strokeWidth: 1.6 }),
    path({ d: `M${round(x - r)},${round(y)} L${round(x - r * 0.45)},${round(y)} M${round(x + r * 0.45)},${round(y)} L${round(x + r)},${round(y)}`, ...lineStyle }),
  ],
  rings: (x, y, r) => [
    circle({ cx: round(x), cy: round(y), r: round(r * 0.62), fill: 'none', ...lineStyle }),
    circle({ cx: round(x), cy: round(y), r: round(r * 0.32), fill: 'none', stroke: ink, strokeWidth: 0.7 }),
  ],
  cross: (x, y, r) => [path({ d: `M${round(x - r)},${round(y)} L${round(x + r)},${round(y)} M${round(x)},${round(y - r)} L${round(x)},${round(y + r)}`, ...lineStyle })],
}

export const clipPath = (id: string, d: string, transform?: string) => svgEl('clipPath', { id }, path({ d, transform }))

const curve = (cx: number, from: Point, top: number, bottom: number, reach: number) => {
  const [x, y] = from
  return `M${round(x)},${round(y)} Q${round(cx)},${round(top)} ${round(cx + reach)},${round(y)} Q${round(cx)},${round(bottom)} ${round(x)},${round(y)}Z`
}

const happyEye = ({ full }: EyeParts, cx: number, cy: number, k: number) =>
  path({ d: curve(cx, [cx - 13 * k, cy + 4], cy - 14 * k, cy - (full ? 0.5 : 2), 13 * k), fill: ink })

const closedEye = ({ full }: EyeParts, cx: number, cy: number, k: number, sag: number, blinking: boolean) =>
  path({ d: curve(cx, [cx - 13 * k, cy - 1], cy + sag + 1, cy + sag - (full ? 2 : 3.5), 13 * k), fill: ink, class: blinking ? 'face-shut' : null })

const iris = (parts: EyeParts, side: Side, center: Point, s: number, clip: string) => {
  const { colors, pose, full, seed, state } = parts
  const [x, y] = center
  const radius = 7.6 * s * pose.iris
  const glint = pose.alarm ? 0 : 0.6
  return g(
    { clipPath: `url(#${clip})` },
    g(
      { class: irisMotion[state] ?? null, style: { '--side': side } },
      circle({ cx: round(x), cy: round(y), r: round(radius), fill: 'none', stroke: pose.alarm ? white : colors.rim, strokeWidth: full ? 1.5 : 2.4 }),
      circle({ cx: round(x), cy: round(y), r: round(radius - (full ? 2.1 : 2.6)), fill: pose.alarm ? alarm : colors.iris }),
      ...(full ? reticles[seed.reticle](x, y, radius - 2.1, state === 'working') : []),
      circle({ cx: round(x + glint), cy: round(y - glint), r: round((full ? 1.7 : 2.2) * s), fill: white }),
    ),
  )
}

const lidBand = ({ colors, pose, full, state }: EyeParts, lid: Point, side: Side, cx: number, cy: number, s: number, transform: string | undefined, clip: string) => {
  const near: Point = [cx - side * 22, cy + lid[0] * s]
  const far: Point = [cx + side * 22, cy + lid[1] * s]
  return g(
    { clipPath: `url(#${clip})`, class: state === 'idle' ? 'face-open' : null },
    g(
      { transform },
      path({ d: `M${points([near, far, [far[0], cy - 30], [near[0], cy - 30]])}Z`, fill: colors.box, opacity: pose.band }),
      path({ d: `M${points([near, far])}`, stroke: ink, strokeWidth: full ? 4.5 : 6 }),
    ),
  )
}

export const eye = (parts: EyeParts, side: Side, cx: number, cy: number) => {
  const { seed, colors, pose, full, id, state } = parts
  const k = full ? 1 : 1.08
  if (pose.eyes === 'happy') return { eye: happyEye(parts, cx, cy, k) }
  if (pose.eyes === 'closed') return { eye: closedEye(parts, cx, cy, k, 8, false) }

  const s = (side < 0 ? pose.scale[0] : pose.scale[1]) * k
  const shape = seed.eye === 'cat' ? 'lens' : seed.eye
  const transform = seed.eye === 'cat' ? `rotate(${side * -11} ${round(cx)} ${round(cy)})` : undefined
  const shift = (seed.wing + 1) * 0.9 * side
  const inner = eyePath(shape, cx + shift, cy, 12.6 * s, 8.8 * s)
  const socketClip = `${id}s${side}`
  const innerClip = `${socketClip}i`
  const angles = ticks[seed.ticks].map(angle => (side > 0 ? angle : 180 - angle))
  const outer = (pose.alarm ? 22.5 : 20) * s
  const blinking = state === 'idle'
  const wing: Point[] = [
    [cx + side * 13 * s, cy - 6 * s],
    [cx + side * 24 * s, cy - 10 * s],
    [cx + side * 17 * s, cy + 1],
  ]

  const open = g(
    { transform, class: blinking ? 'face-open' : null },
    clipPath(socketClip, eyePath(shape, cx, cy, 18.5 * s + 1.4, 13.6 * s + 1.4), transform),
    clipPath(innerClip, inner),
    path({ d: angles.map(angle => spike(cx, cy, angle, 8 * s, outer, full ? 10 : 12)).join(' '), fill: ink }),
    seed.wing === 2 ? path({ d: `M${points(wing)}Z`, fill: ink }) : null,
    path({ d: eyePath(shape, cx, cy, 18.5 * s, 13.6 * s), fill: ink }),
    path({ d: eyePath(shape, cx, cy, 16.2 * s, 11.9 * s), fill: pose.alarm ? white : colors.rim }),
    full ? path({ d: angles.map(angle => spike(cx, cy, angle, 9 * s, 16.4 * s, 6)).join(' '), fill: ink }) : null,
    path({ d: inner, fill: ink }),
    iris(parts, side, [cx + pose.look[0] - shift * 0.4, cy + pose.look[1]], s, innerClip),
  )

  return {
    eye: g({}, open, blinking ? closedEye(parts, cx, cy, k, 3, true) : null),
    lid: pose.lid && lidBand(parts, pose.lid, side, cx, cy, s, transform, socketClip),
  }
}
