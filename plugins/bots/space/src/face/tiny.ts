import { circle, g, path, rect } from '@vaakx-dev/vrui'
import { clipPath, type Side } from './eyes'
import { eyePath, points, round } from './geometry'
import { alarm, ink, white, type Neon } from './palette'
import type { FaceState, Pose } from './pose'
import type { Seed } from './seed'

export interface TinyParts {
  seed: Seed
  colors: Neon
  pose: Pose
  state: FaceState
  id: string
}

const cy = 7.5

const shut = (cx: number, blinking: boolean) =>
  path({ d: `M${round(cx - 2.9)},${cy} Q${cx},${cy + 2.6} ${round(cx + 2.9)},${cy}`, fill: 'none', stroke: ink, strokeWidth: 1.8, class: blinking ? 'face-shut' : null })

const open = ({ seed, colors, pose, state, id }: TinyParts, side: Side, cx: number) => {
  const shape = seed.eye === 'cat' ? 'lens' : seed.eye
  const transform = seed.eye === 'cat' ? `rotate(${side * -11} ${round(cx)} ${cy})` : undefined
  const clip = `${id}e${side}`
  const x = cx + pose.look[0] / 7
  const y = cy + pose.look[1] / 8
  const lidTop = pose.lid && Math.min(cy - 1.1, cy + Math.min(...pose.lid) * 0.16)
  return g(
    { class: state === 'idle' ? 'face-open' : null },
    g(
      { transform },
      path({ d: eyePath(shape, cx, cy, 3.75, 2.95), fill: ink }),
      path({ d: eyePath(shape, cx, cy, 3, 2.2), fill: pose.alarm ? white : colors.rim }),
      path({ d: eyePath(shape, cx + side * 0.35, cy, 2.2, 1.55), fill: ink }),
    ),
    circle({ cx: round(x), cy: round(y), r: pose.alarm ? 1.05 : 1.35, fill: pose.alarm ? alarm : colors.iris }),
    rect({ x: round(x - 0.45), y: round(y - 0.45), width: 0.9, height: 0.9, fill: white }),
    lidTop === undefined
      ? null
      : [
          clipPath(clip, eyePath(shape, cx, cy, 3.75, 2.95), transform),
          g(
            { clipPath: `url(#${clip})` },
            rect({ x: cx - 4, y: cy - 4, width: 8, height: round(lidTop - cy + 4), fill: colors.box, opacity: pose.band }),
            path({ d: `M${cx - 4},${round(lidTop)} H${cx + 4}`, stroke: ink, strokeWidth: 0.9 }),
          ),
        ],
  )
}

const tinyEye = (parts: TinyParts, side: Side) => {
  const cx = 8 + side * 3.9
  const { pose, state } = parts
  if (pose.eyes === 'happy') {
    return path({ d: `M${points([[cx - 2.9, cy + 1.6], [cx, cy - 1.8], [cx + 2.9, cy + 1.6]])}`, fill: 'none', stroke: ink, strokeWidth: 2 })
  }
  if (pose.eyes === 'closed') return shut(cx, false)
  return g({}, open(parts, side, cx), state === 'idle' ? shut(cx, true) : null)
}

export const tinyEyes = (parts: TinyParts) => [tinyEye(parts, -1), tinyEye(parts, 1)]
