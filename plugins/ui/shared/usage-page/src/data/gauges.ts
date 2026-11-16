import { type Forecast, type History, poolForecast, poolState, type PoolState } from '@sand/usage/contract'
import type { Plan, PlanWindow } from './pool'

export interface Gauge {
  key: string
  plan: Plan
  window: PlanWindow
  state: PoolState
  resetAt?: number
  forecast?: Forecast
}

const soonestReset = ({ members }: PlanWindow, now: number) => {
  const resets = members.flatMap(({ window }) => (window.resetsAt && window.resetsAt > now ? [window.resetsAt] : []))
  return resets.length ? Math.min(...resets) : undefined
}

const gaugeOf = (plan: Plan, window: PlanWindow, history: History | undefined, now: number): Gauge => {
  const forecast = history && poolForecast(window.members, history, now)
  const resetAt = soonestReset(window, now)
  return {
    key: `${plan.kind}|${window.id}`,
    plan,
    window,
    state: poolState(window.members.map(member => member.window), now),
    ...(resetAt && { resetAt }),
    ...(forecast && { forecast }),
  }
}

export const gaugesOf = (plans: Plan[], history: History | undefined, now: number) => plans.flatMap(plan => plan.windows.map(window => gaugeOf(plan, window, history, now)))
