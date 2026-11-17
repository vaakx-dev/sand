import type { LimitWindow, PlanLimits } from '@sand/accounts/contract'
import { fieldsOf, type Json } from '../cli/connection'

const hour = 3_600_000

const groups: Record<string, { label: string; duration: number }> = {
  session: { label: '5-hour', duration: 5 * hour },
  weekly: { label: 'Weekly', duration: 7 * 24 * hour },
}

const statusOf = (percent: number, severity: unknown) => {
  if (percent >= 100) return 'rejected'
  if (severity && severity !== 'normal') return 'allowed_warning'
  return undefined
}

export type Resets = Partial<Record<string, number>>

const RESET_GROUPS: Record<string, string> = { five_hour: 'session', seven_day: 'weekly' }

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
  const group = groups[String(limit.group)]
  const model = fieldsOf(fieldsOf(limit.scope).model).display_name
  const scoped = typeof model === 'string'
  const resetsAt = (!scoped && resets[String(limit.group)]) || (typeof limit.resets_at === 'string' ? Date.parse(limit.resets_at) : undefined)
  const status = statusOf(percent, limit.severity)
  return {
    id: typeof model === 'string' ? `${kind}-${model}` : kind,
    label: typeof model === 'string' ? `${group?.label ?? kind} · ${model}` : (group?.label ?? kind),
    used: Math.min(1, percent / 100),
    ...(resetsAt && { resetsAt }),
    ...(group && { duration: group.duration }),
    ...(status && { status }),
  }
}

export const usageLimits = (usage: Json, resets: Resets = {}): PlanLimits | undefined => {
  const limits = fieldsOf(usage.rate_limits).limits
  const windows = Array.isArray(limits) ? limits.flatMap(limit => windowOf(fieldsOf(limit), resets) ?? []) : []
  return windows.length ? { windows } : undefined
}
