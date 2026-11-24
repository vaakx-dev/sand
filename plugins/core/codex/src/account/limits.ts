import type { LimitWindow, PlanLimits } from '@sand/accounts/contract'
import { fieldsOf, type Json, limitWindow, MINUTE_MS } from '@sand/app-plan'

const WINDOWS = ['primary', 'secondary'] as const

const windowOf = (id: string, raw: Json): LimitWindow | undefined => {
  const used = Number(raw.usedPercent)
  if (!Number.isFinite(used)) return undefined
  const minutes = Number(raw.windowDurationMins)
  const resetsAt = Number(raw.resetsAt)
  return limitWindow({ id, used: used / 100, ...(minutes > 0 && { durationMs: minutes * MINUTE_MS }), ...(resetsAt > 0 && { resetsAt: resetsAt * 1000 }) })
}

export const limitsOf = (snapshot: unknown): PlanLimits | undefined => {
  const limits = fieldsOf(snapshot)
  const windows = WINDOWS.flatMap(id => (limits[id] ? (windowOf(id, fieldsOf(limits[id])) ?? []) : []))
  if (!windows.length) return undefined
  return limits.rateLimitReachedType ? { windows, status: 'rejected' } : { windows }
}
