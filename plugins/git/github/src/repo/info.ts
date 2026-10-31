import type { Client } from '../api/client'

const keepMs = 10 * 60_000

export interface RepoInfo {
  defaultBranch: string
  parent?: string
}

interface ApiRepo {
  default_branch: string
  parent?: { full_name: string }
}

export type RepoInfos = (repo: string) => Promise<RepoInfo>

export const createRepoInfos = (client: Client): RepoInfos => {
  const known = new Map<string, { info: Promise<RepoInfo>; until: number }>()

  const load = async (repo: string): Promise<RepoInfo> => {
    const data = await client.rest<ApiRepo>('GET', `/repos/${repo}`)
    return { defaultBranch: data.default_branch, ...(data.parent ? { parent: data.parent.full_name } : {}) }
  }

  return repo => {
    const found = known.get(repo)
    if (found && found.until > Date.now()) return found.info
    const info = load(repo)
    known.set(repo, { info, until: Date.now() + keepMs })
    info.catch(() => known.get(repo)?.info === info && known.delete(repo))
    return info
  }
}
