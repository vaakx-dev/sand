import type { LimitWindow } from '@sand/accounts/contract'
import { hourKey } from './keys'
import { hour, spentBetween, startOfHour, type Hourly, type Pattern } from './hours'

const SPREAD = 0.3

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
  pace: Point[]
  outAt?: number
  backAt?: number
  leftAtReset: number
}

export interface Budget {
  start: number
  reset: number
  duration: number
  used: number
}

export interface Drawn extends Budget {
  hourly: Hourly
}

interface Run {
  ahead: Point[]
  outAt?: number
  left: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export const usedNow = ({ resetsAt, used }: LimitWindow, now: number) => (resetsAt !== undefined && resetsAt <= now ? 0 : clamp(used))

export const budgetOf = (window: LimitWindow, now: number): Budget | undefined => {
  const { duration, resetsAt } = window
  if (!duration) return undefined
  const reset = resetsAt !== undefined && resetsAt > now ? resetsAt : now + duration
  return { start: reset - duration, reset, duration, used: usedNow(window, now) }
}

export const paceAt = (budgets: Budget[], at: number) => mean(budgets.map(budget => clamp((budget.reset - at) / budget.duration)))

const paceOf = (budgets: Budget[], start: number, end: number): Point[] =>
  [...new Set([start, end, ...budgets.flatMap(budget => [budget.start, budget.reset])])]
    .filter(at => at >= start && at <= end)
    .sort((first, second) => first - second)
    .map(at => ({ at, left: paceAt(budgets, at) }))

const pastOf = (drawn: Drawn[], start: number, now: number) => {
  const ratios = drawn.map(budget => {
    const spent = spentBetween(budget.hourly, budget.start, now)
    return spent > 0 ? budget.used / spent : undefined
  })
  const spent = drawn.map(() => 0)
  const begun = (budget: Drawn, at: number) => startOfHour(budget.start) <= at
  const leftAt = (at: number) =>
    mean(
      drawn.map((budget, index) => {
        const ratio = ratios[index]
        if (!begun(budget, at)) return 1
        return ratio === undefined ? 1 - budget.used : clamp(1 - spent[index]! * ratio)
      }),
    )
  const points: Point[] = [{ at: start, left: leftAt(start) }]
  for (let at = startOfHour(start); at < now; at += hour) {
    drawn.forEach((budget, index) => {
      if (begun(budget, at)) spent[index]! += budget.hourly.get(hourKey(at)) ?? 0
    })
    points.push({ at: Math.max(start, Math.min(at + hour, now)), left: leftAt(at) })
  }
  return points
}

const drain = (budgets: Budget[], perHour: Pattern, now: number, end: number): Run => {
  const left = budgets.map(budget => 1 - budget.used)
  const soonestFirst = budgets.map((_, index) => index).sort((first, second) => budgets[first]!.reset - budgets[second]!.reset)
  const resets = budgets.map(budget => budget.reset)
  const firstReset = Math.min(...resets)
  const ahead: Point[] = [{ at: now, left: mean(left) }]
  let outAt: number | undefined
  for (let at = now; at < end; ) {
    const next = Math.min(startOfHour(at) + hour, ...resets.filter(reset => reset > at))
    const wanted = (perHour(at) * (next - at)) / hour
    let owed = wanted
    for (const index of soonestFirst) {
      if (budgets[index]!.reset <= at) continue
      const taken = Math.min(left[index]!, owed)
      left[index]! -= taken
      owed -= taken
    }
    if (outAt === undefined && owed > 0 && at < firstReset) outAt = at + (next - at) * (1 - owed / wanted)
    ahead.push({ at: next, left: mean(left) })
    at = next
  }
  return { ahead, outAt, left: mean(left) }
}

export const projectPool = (drawn: Drawn[], pattern: Pattern, now: number): Forecast | undefined => {
  const spent = drawn.map(budget => spentBetween(budget.hourly, budget.start, now))
  const used = sum(drawn.filter((_, index) => spent[index]! > 0).map(budget => budget.used))
  if (used <= 0) return undefined
  const ratio = used / sum(spent)
  const start = Math.min(...drawn.map(budget => budget.start))
  const end = Math.max(...drawn.map(budget => budget.reset))
  const run = (scale: number) => drain(drawn, at => pattern(at) * ratio * scale, now, end)
  const even = run(1)
  const firstReset = Math.min(...drawn.map(budget => budget.reset))
  return {
    start,
    now,
    reset: end,
    past: pastOf(drawn, start, now),
    ahead: even.ahead,
    low: run(1 + SPREAD).ahead,
    high: run(1 - SPREAD).ahead,
    pace: paceOf(drawn, start, end),
    ...(even.outAt !== undefined && { outAt: even.outAt, backAt: firstReset }),
    leftAtReset: even.left,
  }
}
