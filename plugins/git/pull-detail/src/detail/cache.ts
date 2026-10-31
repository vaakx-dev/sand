import { type GitHub, type PullRef, pullKey } from '@sand/github/contract'
import { ttlCache } from '@sand/util'
import { fetchDetail, type LoadedPull } from './fetch'

const openMs = 30_000
const doneMs = 10 * 60_000
const most = 100

export interface Details {
  get(ref: PullRef, fresh?: boolean): Promise<LoadedPull>
  refresh(ref: PullRef): Promise<LoadedPull>
  drop(ref: PullRef): void
  outdate(ref: PullRef): boolean
  clear(): void
}

const keepFor = ({ detail }: LoadedPull) => (detail.state === 'open' || detail.state === 'draft' ? openMs : doneMs)

export const createDetails = (github: GitHub): Details => {
  const pulls = ttlCache<LoadedPull>({
    ttl: keepFor,
    most,
    stored: (_key, pull) => github.noteSummary(pull.ids.pull, pull.summary),
  })

  const fetchOf = (ref: PullRef) => () => fetchDetail(github, ref)

  return {
    get: (ref, fresh) => pulls.get(pullKey(ref), fetchOf(ref), fresh),
    refresh: ref => pulls.refresh(pullKey(ref), fetchOf(ref)),
    drop: ref => void pulls.delete(pullKey(ref)),
    outdate(ref) {
      const key = pullKey(ref)
      return !pulls.isLoading(key) && pulls.delete(key)
    },
    clear: pulls.clear,
  }
}
