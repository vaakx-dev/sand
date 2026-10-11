import type { Limits, LimitWindow } from '../contract'
import { capital } from '@sand/kit'

const prefix = 'anthropic-ratelimit-unified-'
const utilization = /^anthropic-ratelimit-unified-(.+)-utilization$/
const hour = 3_600_000
const windowNames = new Map([
  ['5h', '5-hour'],
  ['7d', 'Weekly'],
])
const windowOrder = ['5h', '7d']

const label = (id: string) => {
  const [window = id, ...rest] = id.split(/[_-]/)
  const base = windowNames.get(window) ?? window
  const scope = rest.join(' ')
  return scope ? `${base} · ${capital(scope)}` : base
}

const durationOf = (id: string) => {
  const match = /^(\d+)([hd])/.exec(id)
  return match ? Number(match[1]) * (match[2] === 'h' ? hour : 24 * hour) : undefined
}

const rank = (window: LimitWindow) => {
  const index = windowOrder.findIndex(start => window.id.startsWith(start))
  return index < 0 ? windowOrder.length : index
}

export const parseLimits = (headers: Headers): Limits | undefined => {
  const windows: LimitWindow[] = []
  headers.forEach((value, key) => {
    const id = utilization.exec(key)?.[1]
    if (!id) return
    const reset = Number(headers.get(`${prefix}${id}-reset`))
    const status = headers.get(`${prefix}${id}-status`)
    const duration = durationOf(id)
    windows.push({
      id,
      label: label(id),
      used: Number(value),
      ...(reset > 0 && { resetsAt: reset * 1000 }),
      ...(duration && { duration }),
      ...(status && { status }),
    })
  })
  if (!windows.length) return undefined
  windows.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))
  const status = headers.get(`${prefix}status`)
  return { source: 'claude', windows, ...(status && { status }), updated: Date.now() }
}
