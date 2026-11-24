import type { LimitWindow, PlanLimits } from '@sand/accounts/contract'
import { fieldsOf, HOUR_MS, type Json, limitWindow, textOf, WEEK_MS } from '@sand/app-plan'

export type Resets = Partial<Record<string, number>>

const DURATIONS_MS: Record<string, number> = { session: 5 * HOUR_MS, weekly: WEEK_MS }

const RESET_GROUPS: Record<string, string> = { five_hour: 'session', seven_day: 'weekly' }

const warned = (severity: unknown) => (severity && severity !== 'normal' ? 'allowed_warning' : undefined)

const secondsAt = (value: unknown) => (Number(value) > 0 ? Number(value) * 1000 : undefined)

export const resetsOf = (info: Json): Resets => {
  const windows = Object.entries(fieldsOf(info.unifiedWindows)).map(([type, window]) => [type, secondsAt(fieldsOf(window).resetsAt)] as const)
  const claimed = [[String(info.rateLimitType), secondsAt(info.resetsAt)] as const]
  return Object.fromEntries([...windows, ...claimed].flatMap(([type, at]) => (RESET_GROUPS[type] && at ? [[RESET_GROUPS[type], at]] : [])))
}

const windowOf = (limit: Json, resets: Resets): LimitWindow | undefined => {
  const percent = Number(limit.percent)
  if (!Number.isFinite(percent)) return undefined
  const kind = String(limit.kind ?? 'limit')
  const group = String(limit.group)
  const model = textOf(fieldsOf(fieldsOf(limit.scope).model).display_name)
  const resetsAt = (!model && resets[group]) || (typeof limit.resets_at === 'string' ? Date.parse(limit.resets_at) : undefined)
  return limitWindow({ id: model ? `${kind}-${model}` : kind, used: percent / 100, durationMs: DURATIONS_MS[group], resetsAt, scope: model, status: warned(limit.severity) })
}

export const usageLimits = (usage: Json, resets: Resets = {}): PlanLimits | undefined => {
  const limits = fieldsOf(usage.rate_limits).limits
  const windows = Array.isArray(limits) ? limits.flatMap(limit => windowOf(fieldsOf(limit), resets) ?? []) : []
  return windows.length ? { windows } : undefined
}
