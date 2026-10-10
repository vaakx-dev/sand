import type { WorktreeMark } from '../contract'
import type { WebContext, WorktreeClient } from './client'

const freshMs = 30_000
const gatherMs = 30
const chunk = 200

interface Known {
  at: number
  mark: WorktreeMark | null | undefined
}

const same = (a: WorktreeMark | null | undefined, b: WorktreeMark | null | undefined) => a?.branch === b?.branch && a?.main === b?.main

export const createMarks = (ctx: WebContext, client: WorktreeClient) => {
  const known = new Map<string, Known>()
  const loading = new Set<string>()
  const queued = new Map<string, Set<string>>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const keyOf = (device: string, cwd: string) => `${device}\0${cwd}`

  const store = (device: string, cwds: string[], found?: Record<string, WorktreeMark | null>) => {
    let changed = false
    for (const cwd of cwds) {
      const key = keyOf(device, cwd)
      loading.delete(key)
      const before = known.get(key)?.mark
      const mark = found ? (found[cwd] ?? null) : before
      known.set(key, { at: Date.now(), mark })
      if (!same(before, mark)) changed = true
    }
    if (changed) ctx.emit('worktrees.change')
  }

  const load = async (device: string, cwds: string[]) =>
    store(device, cwds, await client.marks(cwds, device || undefined).catch(() => undefined))

  const flush = () => {
    timer = undefined
    for (const [device, set] of queued) {
      const cwds = [...set]
      for (let at = 0; at < cwds.length; at += chunk) void load(device, cwds.slice(at, at + chunk))
    }
    queued.clear()
  }

  const queue = (device: string, cwd: string) => {
    const key = keyOf(device, cwd)
    if (ctx.wire.state() !== 'open' || loading.has(key)) return
    loading.add(key)
    queued.set(device, (queued.get(device) ?? new Set<string>()).add(cwd))
    timer ??= setTimeout(flush, gatherMs)
  }

  ctx.effect(() => () => clearTimeout(timer))

  return {
    of(cwd: string, device?: string) {
      if (!cwd) return undefined
      const place = device ?? ''
      const entry = known.get(keyOf(place, cwd))
      if (!entry || Date.now() - entry.at > freshMs) queue(place, cwd)
      return entry?.mark
    },
    forget() {
      for (const entry of known.values()) entry.at = 0
      ctx.emit('worktrees.change')
    },
  }
}

export type Marks = ReturnType<typeof createMarks>
