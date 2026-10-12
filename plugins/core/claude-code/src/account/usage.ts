import type { LimitWindow, PlanLimits } from '@sand/llm-accounts/contract'
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

const windowOf = (limit: Json): LimitWindow | undefined => {
  const percent = Number(limit.percent)
  if (!Number.isFinite(percent)) return undefined
  const kind = String(limit.kind ?? 'limit')
  const group = groups[String(limit.group)]
  const model = fieldsOf(fieldsOf(limit.scope).model).display_name
  const resetsAt = typeof limit.resets_at === 'string' ? Date.parse(limit.resets_at) : undefined
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

export const usageLimits = (usage: Json): PlanLimits | undefined => {
  const limits = fieldsOf(usage.rate_limits).limits
  const windows = Array.isArray(limits) ? limits.flatMap(limit => windowOf(fieldsOf(limit)) ?? []) : []
  return windows.length ? { windows } : undefined
}
