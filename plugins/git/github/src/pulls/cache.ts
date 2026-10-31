import { ttlCache } from '@sand/util'
import type { Client } from '../api/client'
import type { PullRef, PullSummary } from '../contract'
import { pullKey } from './ref'
import { type FetchedPull, fetchPull } from './summary/fetch'

const openMs = 15_000
const doneMs = 10 * 60_000
const most = 500

export interface Summaries {
  get(ref: PullRef, fresh?: boolean): Promise<PullSummary>
  refresh(ref: PullRef): Promise<PullSummary>
  id(ref: PullRef): Promise<string>
  note(id: string, summary: PullSummary): void
}

const keepFor = ({ summary }: FetchedPull) => (summary.state === 'open' || summary.state === 'draft' ? openMs : doneMs)

const differs = (previous: FetchedPull | undefined, next: FetchedPull) => previous !== undefined && JSON.stringify(previous.summary) !== JSON.stringify(next.summary)

export const createSummaries = (client: Client, changed: (summary: PullSummary) => void): Summaries => {
  const refreshing = new Map<string, Promise<FetchedPull>>()
  const pulls = ttlCache<FetchedPull>({
    ttl: keepFor,
    most,
    stored(key, next, previous) {
      if (refreshing.has(key) || differs(previous, next)) changed(next.summary)
    },
  })

  const fetchOf = (ref: PullRef) => () => fetchPull(client, ref)
  const current = (ref: PullRef, fresh?: boolean) => pulls.get(pullKey(ref), fetchOf(ref), fresh)

  const refresh = (ref: PullRef) => {
    const key = pullKey(ref)
    const loading: Promise<FetchedPull> = pulls.refresh(key, fetchOf(ref)).finally(() => {
      if (refreshing.get(key) === loading) refreshing.delete(key)
    })
    refreshing.set(key, loading)
    return loading
  }

  return {
    get: (ref, fresh) => current(ref, fresh).then(pull => pull.summary),
    refresh: ref => refresh(ref).then(pull => pull.summary),
    id: async ref => pulls.peek(pullKey(ref))?.id ?? (await current(ref)).id,
    note: (id, summary) => pulls.set(pullKey(summary), { id, summary }),
  }
}
