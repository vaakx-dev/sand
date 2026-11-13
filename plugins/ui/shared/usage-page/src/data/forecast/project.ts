import type { LimitWindow } from '@sand/accounts/contract'
import { hourKey } from '../../range'
import { hour, spentBetween, startOfHour, type Hourly, type Pattern } from './hours'

const spread = 0.3

export interface Point {
  at: number
  left: number
}

export interface Forecast {
  start: number
  now: number
  reset: number
  past: Point[]
  ahead: Point[]
  low: Point[]
  high: Point[]
  outAt?: number
  leftAtReset: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

const pastOf = (hourly: Hourly, start: number, now: number, ratio: number) => {
  const points: Point[] = [{ at: start, left: 1 }]
  let spent = 0
  for (let at = startOfHour(start); at < now; at += hour) {
    spent += hourly.get(hourKey(at)) ?? 0
    points.push({ at: Math.max(start, Math.min(at + hour, now)), left: clamp(1 - spent * ratio) })
  }
  return points
}

const aheadOf = (window: Required<Pick<LimitWindow, 'resetsAt' | 'used'>>, pattern: Pattern, ratio: number, now: number) => {
  const ahead: Point[] = [{ at: now, left: clamp(1 - window.used) }]
  const low: Point[] = [...ahead]
  const high: Point[] = [...ahead]
  let left = 1 - window.used
  let spent = 0
  let outAt: number | undefined
  for (let at = now; at < window.resetsAt; ) {
    const next = Math.min(startOfHour(at) + hour, window.resetsAt)
    const used = (pattern(at) * ratio * (next - at)) / hour
    if (outAt === undefined && left > 0 && left - used <= 0) outAt = at + ((next - at) * left) / used
    left -= used
    spent += used
    ahead.push({ at: next, left: clamp(left) })
    low.push({ at: next, left: clamp(left - spent * spread) })
    high.push({ at: next, left: clamp(left + spent * spread) })
    at = next
  }
  return { ahead, low, high, outAt, leftAtReset: clamp(left) }
}

export const forecastOf = (window: LimitWindow, hourly: Hourly, pattern: Pattern, now: number): Forecast | undefined => {
  const { resetsAt, duration, used } = window
  if (!resetsAt || !duration || resetsAt <= now || used <= 0) return undefined
  const start = resetsAt - duration
  const spent = spentBetween(hourly, start, now)
  if (spent <= 0) return undefined
  const ratio = used / spent
  return { start, now, reset: resetsAt, past: pastOf(hourly, start, now, ratio), ...aheadOf({ resetsAt, used }, pattern, ratio, now) }
}
