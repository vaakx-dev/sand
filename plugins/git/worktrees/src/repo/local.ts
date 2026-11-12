import type { GitRepo, GitRepoLocal } from '@sand/git/contract'

const notRepo = (cwd: string) => new Error(`${cwd} isn't in a git repository.`)

export const repoAt = async (repos: GitRepo, cwd: string): Promise<GitRepoLocal> => {
  const local = await repos.local(cwd)
  if (!local.repo) throw notRepo(cwd)
  return local
}

export const mainAt = async (repos: GitRepo, cwd: string) => {
  const layout = await repos.layout(cwd)
  if (!layout) throw notRepo(cwd)
  return layout.main
}
