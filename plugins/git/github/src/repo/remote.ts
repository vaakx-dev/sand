import type { GitRunner } from '@sand/git/contract'
import { githubHost } from '../api/endpoint'
import { readRemotes } from './remotes'

export const remoteFor = async (git: GitRunner, cwd: string, repo: string) => {
  const wanted = repo.toLowerCase()
  for (const [name, slug] of await readRemotes(git, cwd)) if (slug.toLowerCase() === wanted) return name
  return `https://${githubHost}/${repo}.git`
}
