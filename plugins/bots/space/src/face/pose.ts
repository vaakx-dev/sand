import type { Personality, Point } from './seed'

export type FaceState = 'idle' | 'working' | 'happy' | 'needs' | 'sleeping'

export interface Pose {
  lid?: Point
  look: Point
  scale: Point
  iris: number
  tilt: number
  eyes: 'open' | 'happy' | 'closed'
  mouth: 'idle' | 'working' | 'happy' | 'needs' | 'sleep'
  mark?: 'dots' | 'sparkle' | 'bang' | 'z'
  glow: number
  band: number
  alarm: boolean
}

type Look = Pick<Pose, 'lid' | 'look' | 'scale'> & Partial<Pick<Pose, 'iris' | 'tilt'>>

const looks: Record<Personality, Look> = {
  smug: { lid: [-1.5, -2.5], look: [2.6, 0.8], scale: [1, 1] },
  sleepy: { lid: [0.5, 2.5], look: [0, 1.6], scale: [1, 1] },
  excited: { look: [0, -0.6], scale: [1.08, 1.08], iris: 1.1 },
  curious: { look: [2.2, -1.4], scale: [1.12, 0.88], tilt: -4 },
  focused: { lid: [-2.5, -9], look: [0, 0.8], scale: [1, 1] },
}

const states: Record<Exclude<FaceState, 'idle'>, Partial<Pose>> = {
  working: { lid: [-2.5, -7], look: [0, 0.6], scale: [1, 1], tilt: 0, mouth: 'working', mark: 'dots', iris: 0.95 },
  happy: { eyes: 'happy', mouth: 'happy', mark: 'sparkle', glow: 0.26, tilt: 0 },
  needs: { lid: undefined, look: [0, 0], scale: [1.1, 1.1], iris: 0.82, alarm: true, mouth: 'needs', mark: 'bang', glow: 0.32, tilt: 0 },
  sleeping: { eyes: 'closed', mouth: 'sleep', mark: 'z', glow: 0.06, band: 0.5, tilt: 0 },
}

export const poseOf = (personality: Personality, state: FaceState): Pose => {
  const base: Pose = { iris: 1, tilt: 0, eyes: 'open', mouth: 'idle', glow: 0.18, band: 1, alarm: false, ...looks[personality] }
  return state === 'idle' ? base : { ...base, ...states[state] }
}
