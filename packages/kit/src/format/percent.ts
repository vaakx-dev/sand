import type { LimitWindow } from '@sand/protocol'
import { coarseDuration } from '../time/duration'

export const percent = (fraction: number) => `${Math.round(fraction * 100)}%`

export const leftOf = (window: LimitWindow) => Math.max(0, Math.min(1, 1 - window.used))

export const windowText = (window: LimitWindow) =>
  [`${percent(leftOf(window))} left`, window.resetsAt && `resets in ${coarseDuration(window.resetsAt - Date.now())}`].filter(Boolean).join(' · ')
