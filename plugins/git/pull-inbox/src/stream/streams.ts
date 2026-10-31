import type { PullSummary } from '@sand/github/contract'
import { uuid } from '@sand/util'
import type { Found } from '../search/page'
import type { PullStream } from './stream'

const freshMs = 30_000
const keepMs = 10 * 60_000
const most = 20

interface Entry {
  id: string
  key: string
  stream: PullStream
  made: number
  used: number
}

export interface OpenOptions {
  id?: string | undefined
  fresh?: boolean | undefined
}

export interface Opened {
  id: string
  stream: PullStream
}

export const createStreams = () => {
  const entries = new Map<string, Entry>()
  const latest = new Map<string, string>()

  const drop = (entry: Entry) => {
    entries.delete(entry.id)
    if (latest.get(entry.key) === entry.id) latest.delete(entry.key)
  }

  const prune = (now: number) => {
    for (const entry of entries.values()) if (now - entry.used > keepMs) drop(entry)
    const byUse = [...entries.values()].sort((a, b) => a.used - b.used)
    for (const entry of byUse.slice(0, Math.max(0, byUse.length - most))) drop(entry)
  }

  const reusable = (key: string, options: OpenOptions, now: number) => {
    const named = options.id ? entries.get(options.id) : undefined
    if (named?.key === key) return named
    if (options.fresh) return undefined
    const current = entries.get(latest.get(key) ?? '')
    return current && now - current.made < freshMs ? current : undefined
  }

  const open = (key: string, make: () => PullStream, options: OpenOptions = {}): Opened => {
    const now = Date.now()
    prune(now)
    const found = reusable(key, options, now)
    if (found) {
      found.used = now
      return found
    }
    const entry: Entry = { id: uuid(), key, stream: make(), made: now, used: now }
    entries.set(entry.id, entry)
    latest.set(key, entry.id)
    return entry
  }

  return {
    open,
    patch(summary: PullSummary): Found | undefined {
      const patched = [...entries.values()].flatMap(entry => entry.stream.patch(summary) ?? [])
      const first = patched[0]
      return first && { ...first, requested: patched.some(found => found.requested) }
    },
    clear() {
      entries.clear()
      latest.clear()
    },
  }
}
