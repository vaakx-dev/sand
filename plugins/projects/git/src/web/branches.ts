import type { Context } from 'drydock'
import type { Branches } from '../contract'
import { askBranches, type Names } from './ask'

const freshMs = 15000
const gatherMs = 30
const chunk = 200

interface Known {
  at: number
  name?: string
}

export const createBranches = (ctx: Context<'wire'>): Branches => {
  const known = new Map<string, Known>()
  const loading = new Set<string>()
  const queued = new Map<string, Set<string>>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const keyOf = (device: string, cwd: string) => `${device}\0${cwd}`

  const settle = (device: string, cwds: string[], names?: Names) => {
    let changed = false
    for (const cwd of cwds) {
      const key = keyOf(device, cwd)
      loading.delete(key)
      const before = known.get(key)?.name
      const name = names ? (names[cwd] ?? undefined) : before
      known.set(key, { at: Date.now(), name })
      if (before !== name) changed = true
    }
    if (changed) ctx.emit('branches.change')
  }

  const load = async (device: string, cwds: string[]) =>
    settle(device, cwds, await askBranches(ctx.wire, device, cwds).catch(() => undefined))

  const flush = () => {
    timer = undefined
    for (const [device, set] of queued) {
      const cwds = [...set]
      for (let i = 0; i < cwds.length; i += chunk) void load(device, cwds.slice(i, i + chunk))
    }
    queued.clear()
  }

  const queue = (device: string, cwd: string) => {
    const key = keyOf(device, cwd)
    if (ctx.wire.state() !== 'open' || loading.has(key)) return
    loading.add(key)
    const set = queued.get(device) ?? new Set<string>()
    queued.set(device, set.add(cwd))
    timer ??= setTimeout(flush, gatherMs)
  }

  ctx.effect(() => () => clearTimeout(timer))

  return {
    of(cwd, device) {
      if (!cwd) return undefined
      const place = device ?? ''
      const entry = known.get(keyOf(place, cwd))
      if (!entry || Date.now() - entry.at > freshMs) queue(place, cwd)
      return entry?.name
    },
  }
}
