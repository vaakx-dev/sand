import type { LimitWindow } from '@sand/accounts/contract'
import { type Forecast, forecastsOf, type History, hour } from '@sand/usage/contract'

const HEADROOM = 0.9
const CLOSE = 0.1

export interface Candidate {
  source: string
  key: string
  windows: LimitWindow[]
}

interface Pace {
  span: number
  strained: boolean
  waste: number
}

const paceOf = (window: LimitWindow, forecast: Forecast | undefined, now: number): Pace => {
  const ahead = (window.resetsAt ?? now + (window.duration ?? 0)) - now
  const left = forecast ? forecast.leftAtReset : 1 - window.used
  return {
    span: window.duration ?? ahead,
    strained: window.used >= HEADROOM || forecast?.outAt !== undefined,
    waste: (left * (window.duration ?? ahead)) / Math.max(ahead, hour),
  }
}

const close = (a: number, b: number) => Math.abs(a - b) <= CLOSE * Math.max(a, b)

const byWaste = (a: Pace | undefined, b: Pace | undefined) => (b?.waste ?? 0) - (a?.waste ?? 0)

export const planAccounts = <C extends Candidate>(candidates: C[], history: History | undefined, now: number): C[] => {
  const planned = candidates.flatMap((candidate, at) => {
    if (candidate.windows.some(window => window.used >= 1)) return []
    const forecasts = history ? forecastsOf(candidate.key, candidate.windows, history, now) : undefined
    const paces = candidate.windows.map(window => paceOf(window, forecasts?.get(window.id), now)).sort((a, b) => b.span - a.span)
    return [{ candidate, at, strained: paces.some(pace => pace.strained), long: paces[0], short: paces.at(-1) }]
  })
  return planned
    .sort((a, b) => {
      if (a.strained !== b.strained) return Number(a.strained) - Number(b.strained)
      const long = close(a.long?.waste ?? 0, b.long?.waste ?? 0) ? 0 : byWaste(a.long, b.long)
      return long || byWaste(a.short, b.short) || a.at - b.at
    })
    .map(({ candidate }) => candidate)
}
