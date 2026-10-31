import type { GitRepo, GitRepoLocal } from '@sand/git/contract'

export const repoAt = async (repos: GitRepo, cwd: string): Promise<GitRepoLocal> => {
  const local = await repos.local(cwd)
  if (!local.repo) throw new Error(`${cwd} isn't in a git repository.`)
  return local
}
