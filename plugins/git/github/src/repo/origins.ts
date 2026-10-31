import type { GitRunner } from '@sand/git/contract'
import { folderRepo } from './place'

const keepMs = 30_000

export type Origins = (cwd: string) => Promise<string | undefined>

export const createOrigins = (git: GitRunner): Origins => {
  const known = new Map<string, { repo: Promise<string | undefined>; until: number }>()

  const prune = (now: number) => {
    for (const [cwd, entry] of known) if (entry.until <= now) known.delete(cwd)
  }

  return cwd => {
    const now = Date.now()
    const found = known.get(cwd)
    if (found && found.until > now) return found.repo
    prune(now)
    const repo = folderRepo(git, cwd)
    known.set(cwd, { repo, until: now + keepMs })
    repo.catch(() => known.get(cwd)?.repo === repo && known.delete(cwd))
    return repo
  }
}
