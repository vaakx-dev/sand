import type { LimitWindow } from '@sand/accounts/contract'
import type { Forecast } from '../../data/forecast/project'

export type Tone = 'even' | 'ahead' | 'out'

const PACE_MARGIN = 0.05

export const elapsedOf = (window: LimitWindow, now: number) => {
  if (!window.duration || !window.resetsAt) return undefined
  const elapsed = 1 - (window.resetsAt - now) / window.duration
  return elapsed > 0 && elapsed < 1 ? elapsed : undefined
}

const aheadOfPace = (window: LimitWindow, now: number) => {
  const elapsed = elapsedOf(window, now)
  return elapsed !== undefined && elapsed > PACE_MARGIN && window.used - elapsed > PACE_MARGIN
}

export const toneOf = (window: LimitWindow, now: number, forecast?: Forecast): Tone => {
  if (window.used >= 1) return 'out'
  return forecast?.outAt !== undefined || aheadOfPace(window, now) ? 'ahead' : 'even'
}

const sameDay = (at: number) => new Date(at).toDateString() === new Date().toDateString()

const timeText = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const whenText = (at: number) => (sameDay(at) ? timeText(at) : `${new Date(at).toLocaleDateString([], { weekday: 'short' })} ${timeText(at)}`)
