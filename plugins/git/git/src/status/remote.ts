import { gitMaybe } from '../run/run'
import type { GitRemote, GitRepoLocal } from '../contract'

export interface FetchInfo {
  fetchedAt?: number
  fetchError?: string
}

interface Tracking {
  ref: string
  name: string
  remote?: string
}

const trackingFormat = '--format=%(refname)%00%(upstream)%00%(upstream:short)%00%(upstream:remotename)'

const readTracking = async (root: string, branch: string): Promise<Tracking | undefined> => {
  const own = `refs/heads/${branch}`
  const out = await gitMaybe(root, ['for-each-ref', trackingFormat, own], { read: true })
  const line = out?.split(/\r?\n/).find(row => row.startsWith(`${own}\0`))
  const [, ref, name, remote] = line?.split('\0') ?? []
  return ref && name ? { ref, name, remote: remote || undefined } : undefined
}

const sides = async (root: string, other: string) => {
  const out = await gitMaybe(root, ['rev-list', '--left-right', '--count', `HEAD...${other}`, '--'], { read: true })
  const [left, right] = out?.split(/\s+/).map(Number) ?? []
  return left === undefined || right === undefined ? undefined : { left, right }
}

export const readRemote = async (local: GitRepoLocal, fetched: FetchInfo): Promise<GitRemote> => {
  const { root, branch, head, defaultBranch } = local
  const tracking = branch && head ? await readTracking(root, branch) : undefined
  const base = defaultBranch && head ? `origin/${defaultBranch}` : undefined
  const [upstream, vsBase] = await Promise.all([
    tracking ? sides(root, tracking.ref) : undefined,
    base ? sides(root, `refs/remotes/${base}`) : undefined,
  ])
  return {
    remote: tracking?.remote ?? (vsBase ? 'origin' : undefined),
    upstream: upstream ? tracking?.name : undefined,
    ahead: upstream?.left ?? 0,
    behind: upstream?.right ?? 0,
    base: vsBase ? base : undefined,
    behindBase: vsBase?.right ?? 0,
    aheadBase: vsBase?.left ?? 0,
    fetchedAt: fetched.fetchedAt,
    fetchError: fetched.fetchError,
  }
}
