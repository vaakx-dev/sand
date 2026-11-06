import type { BotColor } from '@sand/bots/contract'
import { circle, defs, g, path, rect, svg, svgEl } from '@vaakx-dev/vrui'
import { eye, type EyeParts } from './eyes'
import { boxPath } from './geometry'
import { mark } from './marks'
import { mouth } from './mouth'
import { neon, tile, white } from './palette'
import { poseOf, type FaceState } from './pose'
import { seedOf } from './seed'
import { tinyEyes, type TinyParts } from './tiny'

export interface FaceSpec {
  id: string
  color: BotColor
  state: FaceState
}

const tinyLimit = 24

const bobs: Partial<Record<FaceState, string>> = { happy: 'face-hop', sleeping: 'face-sway' }

let made = 0

const roundedClip = (id: string, extent: number, radius: number) => svgEl('clipPath', { id }, rect({ width: extent, height: extent, rx: radius }))

const glow = (color: string, strength: number, pulsing: boolean) =>
  g({ class: pulsing ? 'face-pulse' : null }, circle({ cx: 50, cy: 45, r: 34, fill: color, opacity: strength, style: { filter: 'blur(18px)' } }))

const tinyFace = (parts: TinyParts, size: number) => {
  const { seed, colors, pose, id } = parts
  return svg(
    { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true', style: { '--phase': seed.phase } },
    defs(roundedClip(`${id}t`, 16, 4)),
    g(
      { clipPath: `url(#${id}t)` },
      rect({ width: 16, height: 16, fill: tile }),
      path({ d: boxPath(seed.box, 14, 82), transform: 'scale(.16)', fill: colors.box, opacity: pose.band }),
      ...tinyEyes(parts),
    ),
  )
}

const fullFace = (parts: EyeParts, size: number) => {
  const { seed, colors, pose, full, id, state } = parts
  const cy = 44.5
  const sides = [eye(parts, -1, 50 - 21, cy), eye(parts, 1, 50 + 21, cy)]
  const shadow = size >= 100 ? 1.3 : 0.8
  return svg(
    { width: size, height: size, viewBox: '0 0 100 100', 'aria-hidden': 'true', style: { '--phase': seed.phase } },
    defs(roundedClip(`${id}t`, 100, 22)),
    g(
      { clipPath: `url(#${id}t)` },
      rect({ width: 100, height: 100, fill: tile }),
      glow(colors.box, pose.glow, state === 'needs'),
      g(
        { transform: pose.tilt ? `rotate(${pose.tilt} 50 55)` : undefined },
        g(
          { class: bobs[state] ?? null },
          path({ d: boxPath(seed.box, 22, 67), fill: colors.box, opacity: pose.band }),
          g(
            { style: full ? { filter: `drop-shadow(${shadow}px 0 0 rgba(255,40,140,.7)) drop-shadow(-${shadow}px 0 0 rgba(40,230,255,.6))` } : null },
            ...sides.map(side => side.eye),
            ...mouth(seed, pose, 81, full),
          ),
          ...sides.map(side => side.lid ?? null),
        ),
      ),
      mark(pose, colors.box, full),
    ),
    rect({ x: 0.75, y: 0.75, width: 98.5, height: 98.5, rx: 21.5, fill: 'none', stroke: white, strokeOpacity: 0.07, strokeWidth: 1.5 }),
  )
}

export const faceView = ({ id, color, state }: FaceSpec, size: number) => {
  const seed = seedOf(id)
  made += 1
  const parts = { seed, colors: neon[color], pose: poseOf(seed.personality, state), state, id: `face${made}`, full: size >= 48 }
  return size <= tinyLimit ? tinyFace(parts, size) : fullFace(parts, size)
}
