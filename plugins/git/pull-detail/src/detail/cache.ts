import type { GitHub, PullRef } from '@sand/github/contract'
import { pullKey } from '../pulls/ref'
import { fetchDetail, type LoadedPull } from './fetch'

const openMs = 30_000
const doneMs = 10 * 60_000
const most = 100

interface Cached {
  pull: LoadedPull
  at: number
}

export interface Details {
  get(ref: PullRef, fresh?: boolean): Promise<LoadedPull>
  refresh(ref: PullRef): Promise<LoadedPull>
  drop(ref: PullRef): void
  outdate(ref: PullRef): boolean
  clear(): void
}

const keepFor = ({ detail }: LoadedPull) => (detail.state === 'open' || detail.state === 'draft' ? openMs : doneMs)

export const createDetails = (github: GitHub): Details => {
  const cached = new Map<string, Cached>()
  const loading = new Map<string, Promise<LoadedPull>>()

  const store = (key: string, pull: LoadedPull) => {
    cached.delete(key)
    cached.set(key, { pull, at: Date.now() })
    github.noteSummary(pull.ids.pull, pull.summary)
    if (cached.size <= most) return
    const oldest = cached.keys().next().value
    if (oldest !== undefined) cached.delete(oldest)
  }

  const load = (ref: PullRef, always: boolean) => {
    const key = pullKey(ref)
    const running = loading.get(key)
    if (running && !always) return running
    const next: Promise<LoadedPull> = fetchDetail(github, ref)
      .then(pull => {
        if (loading.get(key) === next) store(key, pull)
        return pull
      })
      .finally(() => {
        if (loading.get(key) === next) loading.delete(key)
      })
    loading.set(key, next)
    return next
  }

  return {
    get(ref, fresh) {
      const found = cached.get(pullKey(ref))
      if (!fresh && found && Date.now() - found.at < keepFor(found.pull)) return Promise.resolve(found.pull)
      return load(ref, false)
    },
    refresh: ref => load(ref, true),
    drop: ref => void cached.delete(pullKey(ref)),
    outdate(ref) {
      const key = pullKey(ref)
      return !loading.has(key) && cached.delete(key)
    },
    clear() {
      cached.clear()
      loading.clear()
    },
  }
}
