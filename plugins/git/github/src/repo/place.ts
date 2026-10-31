import type { GitRepo, GitRunner } from '@sand/git/contract'
import type { RepoInfos } from './info'
import { pushTarget } from './push'
import { readRemotes } from './remotes'
import { repoSlug } from './slug'

export interface BranchPlace {
  root: string
  branch: string
  head: { repo: string; branch: string }
  base: string
}

export type PlaceResult = { ok: true; place: BranchPlace } | { ok: false; reason: string }

export interface PlaceDeps {
  git: GitRunner
  repos: GitRepo
  infos: RepoInfos
}

const notGitHub = "This folder's remote isn't on GitHub, so it has no pull requests."

export const folderRepo = async (git: GitRunner, cwd: string) => repoSlug(await git.remoteUrl(cwd))

export const pullRepo = async ({ git, infos }: Pick<PlaceDeps, 'git' | 'infos'>, cwd: string) => {
  const origin = await folderRepo(git, cwd)
  return origin ? ((await infos(origin)).parent ?? origin) : undefined
}

export const branchPlace = async ({ git, repos, infos }: PlaceDeps, cwd: string): Promise<PlaceResult> => {
  const local = await repos.local(cwd)
  if (!local.repo) return { ok: false, reason: "This folder isn't a git repository." }
  if (local.detached || !local.branch) return { ok: false, reason: 'No branch is checked out in this folder.' }
  const [origin, remotes, target] = await Promise.all([folderRepo(git, local.root), readRemotes(git, local.root), pushTarget(git, local.root, local.branch)])
  const headRepo = remotes.get(target.remote) ?? origin
  if (!headRepo) return { ok: false, reason: notGitHub }
  const { parent } = await infos(headRepo)
  return {
    ok: true,
    place: { root: local.root, branch: local.branch, head: { repo: headRepo, branch: target.branch }, base: parent ?? origin ?? headRepo },
  }
}
