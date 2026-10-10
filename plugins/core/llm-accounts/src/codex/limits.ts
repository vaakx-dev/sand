import type { Limits, LimitWindow } from '../contract'

const minute = 60_000
const day = 1440

const labelOf = (minutes: number) => {
  if (minutes === 300) return '5-hour'
  if (minutes === 7 * day) return 'Weekly'
  if (minutes % day === 0) return `${minutes / day}-day`
  return minutes % 60 === 0 ? `${minutes / 60}-hour` : `${minutes}-minute`
}

const resetFrom = (at: unknown, after: unknown) => {
  const seconds = Number(at)
  if (seconds > 0) return seconds * 1000
  const wait = Number(after)
  return wait > 0 ? Date.now() + wait * 1000 : undefined
}

const windowOf = (headers: Headers, id: 'primary' | 'secondary'): LimitWindow | undefined => {
  const prefix = `x-codex-${id}`
  const used = Number(headers.get(`${prefix}-used-percent`) ?? NaN)
  if (!Number.isFinite(used)) return undefined
  const minutes = Number(headers.get(`${prefix}-window-minutes`))
  const resetsAt = resetFrom(headers.get(`${prefix}-reset-at`), headers.get(`${prefix}-reset-after-seconds`))
  return {
    id,
    label: minutes > 0 ? labelOf(minutes) : id === 'primary' ? 'Short window' : 'Long window',
    used: Math.min(1, Math.max(0, used / 100)),
    ...(resetsAt && { resetsAt }),
    ...(minutes > 0 && { duration: minutes * minute }),
  }
}

export const parseCodexLimits = (headers: Headers): Limits | undefined => {
  const windows = (['primary', 'secondary'] as const).flatMap(id => windowOf(headers, id) ?? [])
  return windows.length ? { source: 'codex', windows, updated: Date.now() } : undefined
}

const reachedWindow = (resetsAt?: number): LimitWindow => ({ id: 'plan', label: 'Plan limit', used: 1, status: 'rejected', ...(resetsAt && { resetsAt }) })

export const codexLimitReached = async (response: Response, parsed?: Limits): Promise<Limits | undefined> => {
  const body = await response
    .clone()
    .json()
    .catch(() => undefined)
  const error = body?.error
  if (error?.type !== 'usage_limit_reached') return undefined
  const resetsAt = resetFrom(error.resets_at, error.resets_in_seconds)
  const windows = parsed?.windows.map(window => (window.used >= 1 ? { ...window, status: 'rejected' } : window)) ?? [reachedWindow(resetsAt)]
  return { source: 'codex', windows, status: 'rejected', updated: Date.now() }
}
