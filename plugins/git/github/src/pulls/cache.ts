import type { Client } from '../api/client'
import type { PullRef, PullSummary } from '../contract'
import { refKey } from './ref'
import { fetchPull } from './summary/fetch'

const openMs = 15_000
const doneMs = 10 * 60_000
const most = 500

interface Cached {
  summary: PullSummary
  id: string
  at: number
}

export interface Summaries {
  get(ref: PullRef, fresh?: boolean): Promise<PullSummary>
  refresh(ref: PullRef): Promise<PullSummary>
  id(ref: PullRef): Promise<string>
  note(id: string, summary: PullSummary): void
}

const keepFor = (summary: PullSummary) => (summary.state === 'open' || summary.state === 'draft' ? openMs : doneMs)

export const createSummaries = (client: Client, changed: (summary: PullSummary) => void): Summaries => {
  const cached = new Map<string, Cached>()
  const loading = new Map<string, Promise<Cached>>()

  const store = (key: string, next: Cached) => {
    cached.delete(key)
    cached.set(key, next)
    if (cached.size <= most) return
    const oldest = cached.keys().next().value
    if (oldest !== undefined) cached.delete(oldest)
  }

  const keep = (key: string, id: string, summary: PullSummary, always: boolean) => {
    const previous = cached.get(key)?.summary
    const entry = { summary, id, at: Date.now() }
    store(key, entry)
    if (always || (previous && JSON.stringify(previous) !== JSON.stringify(summary))) changed(summary)
    return entry
  }

  const load = (ref: PullRef, always: boolean) => {
    const key = refKey(ref)
    const running = loading.get(key)
    if (running && !always) return running
    const next = fetchPull(client, ref)
      .then(({ id, summary }) => keep(key, id, summary, always))
      .finally(() => {
        if (loading.get(key) === next) loading.delete(key)
      })
    loading.set(key, next)
    return next
  }

  const current = (ref: PullRef, fresh?: boolean) => {
    const found = cached.get(refKey(ref))
    if (!fresh && found && Date.now() - found.at < keepFor(found.summary)) return Promise.resolve(found)
    return load(ref, false)
  }

  return {
    get: (ref, fresh) => current(ref, fresh).then(entry => entry.summary),
    refresh: ref => load(ref, true).then(entry => entry.summary),
    id: async ref => cached.get(refKey(ref))?.id ?? (await current(ref)).id,
    note: (id, summary) => void keep(refKey(summary), id, summary, false),
  }
}
