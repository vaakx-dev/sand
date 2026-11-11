import { colorVar, ellipse, path, span, svg } from '@vaakx-dev/vrui'
import type { Tint } from './monogram'

const tile: Record<string, [hue: number, sat: number, light: number]> = {
  gold: [36, 38, 66],
  sky: [212, 24, 66],
  orange: [22, 26, 60],
  green: [140, 18, 60],
  red: [8, 20, 64],
  grey: [265, 12, 68],
}

export type FaceState = 'running' | 'waiting'

export interface FaceOptions {
  state?: FaceState
  label?: string
}

const hash = (value: string) => {
  let result = 2166136261
  for (const char of value) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

const lookOf = (id: string) => {
  let seed = hash(id) || 1
  const next = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) ^ (seed + Math.imul(seed ^ (seed >>> 7), 3266489917))) >>> 0
    return seed / 4294967296
  }
  const stretch = next() * 3
  const lean = next() * 2 - 1
  const tilt = next() * 2 - 1
  const blink = next() < 0.25
  return { stretch, lean, tilt, blink }
}

const tintOf = (tint: string): Tint => (tint in tile ? (tint as Tint) : 'grey')

export const botFace = (id: string, tint: string, size: 16 | 26 | 32 = 32, options: FaceOptions = {}) => {
  const look = lookOf(id || 'bot')
  const found = tile[tintOf(tint)] ?? tile.grey!
  const fill = `hsl(${found[0]} ${found[1]}% ${found[2]}%)`
  const eyeY = 17
  const eye = look.lean
  const eyeRy = look.blink ? 0.7 : 2
  const top = 4 + look.stretch
  const blob = `M16 ${top.toFixed(1)} C${(24 + look.stretch).toFixed(1)} ${top.toFixed(1)} 28 10 28 18 C28 25 23 28 16 28 C9 28 4 25 4 18 C4 10 ${(8 - look.stretch).toFixed(1)} ${top.toFixed(1)} 16 ${top.toFixed(1)}Z`
  const state = options.state
  const tones = { running: 'info', waiting: 'warning' } as const
  const tone = state === 'running' || state === 'waiting' ? tones[state] : undefined
  const dot = tone
    ? span({
        class: 'pointer-events-none absolute rounded-full',
        style: { right: '-1px', bottom: '-1px', width: '9px', height: '9px', background: colorVar(tone, 400), boxShadow: `0 0 0 2px ${colorVar('neutral', 950)}` },
      })
    : null
  return span(
    {
      class: 'relative inline-flex shrink-0',
      style: { width: `${size}px`, height: `${size}px` },
      role: options.label ? 'img' : undefined,
      'aria-label': options.label,
      'aria-hidden': options.label ? undefined : 'true',
    },
    svg(
      { viewBox: '0 0 32 32', width: size, height: size },
      path({ d: blob, fill }),
      ellipse({ cx: 12.5 + eye, cy: eyeY, rx: 1.6, ry: eyeRy, fill: '#18181b', transform: `rotate(${look.tilt} 12.5 ${eyeY})` }),
      ellipse({ cx: 19.5 + eye, cy: eyeY, rx: 1.6, ry: eyeRy, fill: '#18181b', transform: `rotate(${look.tilt} 19.5 ${eyeY})` }),
    ),
    dot,
  )
}
