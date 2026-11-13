import type { LimitWindow } from '@sand/accounts/contract'
import { hour, spentBetween, startOfHour, type Hourly, type Pattern } from './hours'

export interface Forecast {
  reset: number
  outAt?: number
  leftAtReset: number
}

interface Outlook {
  resetsAt: number
  used: number
  ratio: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

const outlookOf = ({ resetsAt, used, ratio }: Outlook, pattern: Pattern, now: number): Forecast => {
  let left = 1 - used
  let outAt: number | undefined
  for (let at = now; at < resetsAt; ) {
    const next = Math.min(startOfHour(at) + hour, resetsAt)
    const spent = (pattern(at) * ratio * (next - at)) / hour
    if (outAt === undefined && left > 0 && left - spent <= 0) outAt = at + ((next - at) * left) / spent
    left -= spent
    at = next
  }
  return { reset: resetsAt, ...(outAt !== undefined && { outAt }), leftAtReset: clamp(left) }
}

export const forecastOf = (window: LimitWindow, hourly: Hourly, pattern: Pattern, now: number): Forecast | undefined => {
  const { resetsAt, duration, used } = window
  if (!resetsAt || !duration || resetsAt <= now || used <= 0 || used >= 1) return undefined
  const spent = spentBetween(hourly, resetsAt - duration, now)
  if (spent <= 0) return undefined
  return outlookOf({ resetsAt, used, ratio: used / spent }, pattern, now)
}
