export type Point = readonly [x: number, y: number]

type List<T> = readonly [T, ...T[]]

export const boxes = ['hex', 'visor', 'trap', 'slash', 'chevron', 'step', 'tab', 'goggles'] as const
export type Box = (typeof boxes)[number]

const eyes = ['lens', 'lens', 'cat', 'round', 'cut'] as const
export type Eye = (typeof eyes)[number]

const personalities = ['smug', 'sleepy', 'excited', 'curious', 'focused'] as const
export type Personality = (typeof personalities)[number]

const reticles = ['cross', 'x', 'segment', 'slit', 'rings'] as const
export type Reticle = (typeof reticles)[number]

export const ticks = { x: [45, 135, 225, 315], star: [30, 150, 210, 330], h: [0, 180, 60, 120], pair: [125, 305] } as const
export type Ticks = keyof typeof ticks

const tickKinds = ['x', 'star', 'h', 'pair'] as const satisfies List<Ticks>

const wings = [0, 1, 2] as const
export type Wing = (typeof wings)[number]

export const mouths = {
  capri: [[-10, 0], [-5, -2.2], [-1, 1.6], [3, -2.2], [7, 1.2], [10, -0.6]],
  squiggle: [[-8, 1], [-4, -2.4], [0, 1.4], [4, -2.4], [8, 1]],
  step: [[-10, 0], [-4, 0], [-1.5, -2.6], [1.5, 2.6], [4, 0], [10, 0]],
  saw: [[-9, 0.6], [-6, -1.6], [-3, 0.6], [0, -1.6], [3, 0.6], [6, -1.6], [9, 0.6]],
  bolt: [[-9, -1], [-2, -1], [0, 2], [2.5, -2], [4.5, 1], [9, 1]],
  hook: [[-8, 1], [-3, 1], [0, -1.6], [3, 1.2], [6, -0.8], [9, -2.6]],
} as const satisfies Record<string, readonly Point[]>
export type Mouth = keyof typeof mouths

const mouthKinds = ['capri', 'squiggle', 'step', 'saw', 'bolt', 'hook'] as const satisfies List<Mouth>

export interface Seed {
  box: Box
  eye: Eye
  personality: Personality
  reticle: Reticle
  ticks: Ticks
  wing: Wing
  mouth: Mouth
  phase: number
}

const hash = (text: string) => {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return value >>> 0
}

const random = (start: number) => {
  let state = start
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export const seedOf = (id: string): Seed => {
  const next = random(hash(id))
  const pick = <T>(list: List<T>): T => list[Math.floor(next() * list.length)] ?? list[0]
  return {
    eye: pick(eyes),
    personality: pick(personalities),
    box: pick(boxes),
    reticle: pick(reticles),
    ticks: pick(tickKinds),
    wing: pick(wings),
    mouth: pick(mouthKinds),
    phase: next() * 4,
  }
}
