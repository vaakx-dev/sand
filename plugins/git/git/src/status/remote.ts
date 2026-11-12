import { gitMaybe } from '@sand/git-runner/contract'
import type { GitRemote, GitRepoLocal } from '../contract'
import type { Upstream } from './porcelain'

export interface FetchInfo {
  fetchedAt?: number
  fetchError?: string
}

const sides = async (root: string, base: string) => {
  const out = await gitMaybe(root, ['rev-list', '--left-right', '--count', `HEAD...refs/remotes/${base}`, '--'], { read: true })
  const [ahead, behind] = out?.split(/\s+/).map(Number) ?? []
  return ahead === undefined || behind === undefined ? undefined : { ahead, behind }
}

const againstBase = (root: string, base: string, upstream: Upstream | undefined) => (upstream?.name === base ? upstream : sides(root, base))

export const readRemote = async ({ root, head, defaultBranch }: GitRepoLocal, upstream: Upstream | undefined, fetched: FetchInfo): Promise<GitRemote> => {
  const base = defaultBranch && head ? `origin/${defaultBranch}` : undefined
  const vsBase = base ? await againstBase(root, base, upstream) : undefined
  return {
    upstream: upstream?.name,
    ahead: upstream?.ahead ?? 0,
    behind: upstream?.behind ?? 0,
    base: vsBase ? base : undefined,
    behindBase: vsBase?.behind ?? 0,
    aheadBase: vsBase?.ahead ?? 0,
    fetchedAt: fetched.fetchedAt,
    fetchError: fetched.fetchError,
  }
}
