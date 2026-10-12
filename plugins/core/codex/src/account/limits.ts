import type { LimitWindow, PlanLimits } from '@sand/llm-accounts/contract'
import { fieldsOf, type Json } from '../server/rpc'

const minute = 60_000
const day = 1440

const labelOf = (minutes: number) => {
  if (minutes === 300) return '5-hour'
  if (minutes === 7 * day) return 'Weekly'
  if (minutes % day === 0) return `${minutes / day}-day`
  return minutes % 60 === 0 ? `${minutes / 60}-hour` : `${minutes}-minute`
}

const windowOf = (id: string, raw: Json): LimitWindow | undefined => {
  const used = Number(raw.usedPercent)
  if (!Number.isFinite(used)) return undefined
  const minutes = Number(raw.windowDurationMins)
  const resetsAt = Number(raw.resetsAt)
  return {
    id,
    label: minutes > 0 ? labelOf(minutes) : 'Plan limit',
    used: Math.min(1, Math.max(0, used / 100)),
    ...(resetsAt > 0 && { resetsAt: resetsAt * 1000 }),
    ...(minutes > 0 && { duration: minutes * minute }),
    ...(used >= 100 && { status: 'rejected' }),
  }
}

export const limitsOf = (snapshot: unknown): PlanLimits | undefined => {
  const limits = fieldsOf(snapshot)
  const windows = (['primary', 'secondary'] as const).flatMap(id => (limits[id] ? (windowOf(id, fieldsOf(limits[id])) ?? []) : []))
  if (!windows.length) return undefined
  return limits.rateLimitReachedType ? { windows, status: 'rejected' } : { windows }
}
