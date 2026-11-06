import type { BotColor } from '@sand/bots/contract'

export interface Neon {
  box: string
  rim: string
  iris: string
}

export const neon: Record<BotColor, Neon> = {
  gold: { box: '#f2c25c', rim: '#35e0ff', iris: '#ff3f6c' },
  sky: { box: '#35e0ff', rim: '#ff4fa3', iris: '#ffd23a' },
  orange: { box: '#ff7a3d', rim: '#35e0ff', iris: '#e9ff4a' },
  green: { box: '#3dff7a', rim: '#ff4fa3', iris: '#22d6ff' },
  red: { box: '#ff4057', rim: '#d9ff45', iris: '#22d6ff' },
  grey: { box: '#b9b8c6', rim: '#f2c25c', iris: '#22d6ff' },
}

export const ink = '#050506'
export const tile = '#0a0a0b'
export const alarm = '#ff2b4e'
export const white = '#fff'
