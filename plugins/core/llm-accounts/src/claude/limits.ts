import type { Limits, LimitWindow } from '../contract'

const prefix = 'anthropic-ratelimit-unified-'
const utilization = /^anthropic-ratelimit-unified-(.+)-utilization$/

const label = (id: string) => {
  const [window = id, ...rest] = id.split(/[_-]/)
  const base = window === '5h' ? '5-hour' : window === '7d' ? 'Weekly' : window
  const scope = rest.join(' ')
  return scope ? `${base} · ${scope[0]!.toUpperCase()}${scope.slice(1)}` : base
}

const hour = 3_600_000

const durationOf = (id: string) => {
  const match = /^(\d+)([hd])/.exec(id)
  return match ? Number(match[1]) * (match[2] === 'h' ? hour : 24 * hour) : undefined
}

const rank = (window: LimitWindow) => (window.id.startsWith('5h') ? 0 : window.id.startsWith('7d') ? 1 : 2)

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
  return { provider: 'claude', windows, ...(status && { status }), updated: Date.now() }
}
