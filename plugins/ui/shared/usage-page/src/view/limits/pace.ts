import type { LimitWindow } from '@sand/llm-accounts/contract'

export type Pace = 'ahead' | 'on' | 'under'

export const paces: Record<Pace, { icon: string; label: string }> = {
  ahead: { icon: 'trend-up', label: 'Ahead of pace: spending faster than the window elapses' },
  on: { icon: 'gauge', label: 'On pace with the window' },
  under: { icon: 'trend-down', label: 'Under pace: headroom left for the rest of the window' },
}

const margin = 0.05

export const paceOf = (window: LimitWindow, now: number): Pace | undefined => {
  if (!window.duration || !window.resetsAt) return undefined
  const elapsed = 1 - (window.resetsAt - now) / window.duration
  if (elapsed <= margin || elapsed > 1) return undefined
  const ahead = window.used - elapsed
  return ahead > margin ? 'ahead' : ahead < -margin ? 'under' : 'on'
}
