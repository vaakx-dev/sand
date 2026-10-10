import type { LimitWindow } from '@sand/llm-accounts/contract'

export type Pace = 'ahead' | 'on' | 'under'

const margin = 0.05

export const paceOf = (window: LimitWindow, now: number): Pace | undefined => {
  if (!window.duration || !window.resetsAt) return undefined
  const elapsed = 1 - (window.resetsAt - now) / window.duration
  if (elapsed <= margin || elapsed > 1) return undefined
  const ahead = window.used - elapsed
  return ahead > margin ? 'ahead' : ahead < -margin ? 'under' : 'on'
}
