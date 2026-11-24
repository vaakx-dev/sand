import type { LimitWindow, PlanLimits } from '@sand/accounts/contract'

interface WindowSpec {
  id?: string
  used: number
  durationMs?: number
  resetsAt?: number
  scope?: string
  status?: string
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

const NAMED_PERIODS: Record<number, string> = { [5 * HOUR_MS]: '5-hour', [WEEK_MS]: 'Weekly' }

const periodLabel = (durationMs: number) => {
  const named = NAMED_PERIODS[durationMs]
  if (named) return named
  if (durationMs % DAY_MS === 0) return `${durationMs / DAY_MS}-day`
  if (durationMs % HOUR_MS === 0) return `${durationMs / HOUR_MS}-hour`
  return `${Math.round(durationMs / MINUTE_MS)}-minute`
}

const labelOf = (durationMs: number | undefined, scope: string | undefined) => {
  const period = durationMs ? periodLabel(durationMs) : 'Plan limit'
  return scope ? `${period} · ${scope}` : period
}

const limitWindow = ({ id, used, durationMs, resetsAt, scope, status }: WindowSpec): LimitWindow => {
  const fraction = Math.min(1, Math.max(0, used))
  const shown = fraction >= 1 ? 'rejected' : status
  const label = labelOf(durationMs, scope)
  return {
    id: id ?? label,
    label,
    used: fraction,
    ...(resetsAt && { resetsAt }),
    ...(durationMs && { duration: durationMs }),
    ...(shown && { status: shown }),
  }
}

const exhausted = (window: LimitWindow) => window.used >= 1 || window.status === 'rejected'

const resetOf = (limits: PlanLimits | undefined) => {
  const resets = (limits?.windows ?? []).filter(exhausted).flatMap(window => window.resetsAt ?? [])
  return resets.length ? Math.max(...resets) : undefined
}

export { HOUR_MS, limitWindow, MINUTE_MS, resetOf, WEEK_MS }
