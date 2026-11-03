import type { GitRepo, GitRunner } from '@sand/git/contract'
import type { GitHub, PullSummary } from '@sand/github/contract'
import type { PullActivity } from '../activity/types'
import { hasBranch, hasCommit, isAncestor, longGitMs } from './git'

export interface PullBranch {
  name: string
  head: string
  behind: boolean
}

type HeadInfo = Pick<PullActivity, 'fork' | 'headBranch' | 'headOwner'>

const branchName = (pull: PullSummary, head: HeadInfo) => {
  if (!head.fork) return head.headBranch
  return head.headOwner ? `${head.headOwner}-${head.headBranch}` : `pr/${pull.number}`
}

const fetchHead = async (git: GitRunner, main: string, remote: string, pull: PullSummary, sha: string) => {
  const args = ['fetch', '--quiet', '--no-tags', remote, `refs/pull/${pull.number}/head`]
  await git.ok(main, args, { timeoutMs: longGitMs, what: `Couldn't fetch #${pull.number} from ${remote}` })
  if (!(await hasCommit(git, main, sha))) throw new Error(`#${pull.number} moved while it was being fetched. Try again.`)
}

const createBranch = async (git: GitRunner, main: string, remote: string, name: string, sha: string, head: HeadInfo) => {
  await git.ok(main, ['branch', '--no-track', name, sha], { what: `Couldn't create the branch ${name}` })
  if (head.fork) return
  await git.ok(main, ['config', `branch.${name}.remote`, remote], { what: `Couldn't set ${name} to push to ${remote}` })
  await git.ok(main, ['config', `branch.${name}.merge`, `refs/heads/${head.headBranch}`], { what: `Couldn't set ${name} to push to ${remote}` })
}

export interface BranchDeps {
  git: GitRunner
  github: GitHub
}

export const preparePullBranch = async ({ git, github }: BranchDeps, main: string, pull: PullSummary, head: PullActivity): Promise<PullBranch> => {
  const name = branchName(pull, head)
  const remote = await github.remoteFor(main, pull.repo)
  await fetchHead(git, main, remote, pull, head.head)
  if (!(await hasBranch(git, main, name))) {
    await createBranch(git, main, remote, name, head.head, head)
    return { name, head: head.head, behind: false }
  }
  if (await isAncestor(git, main, head.head, `refs/heads/${name}`)) return { name, head: head.head, behind: false }
  if (await isAncestor(git, main, `refs/heads/${name}`, head.head)) return { name, head: head.head, behind: true }
  throw new Error(`Your local ${name} and #${pull.number} have both moved on. Merge or reset ${name} before opening the pull request here.`)
}

const checkedOut = async (repos: GitRepo, main: string, name: string) => (await repos.worktrees(main)).some(tree => tree.branch === name)

export const freeBranch = async (git: GitRunner, repos: GitRepo, main: string, pull: PullSummary, branch: PullBranch) => {
  if (await checkedOut(repos, main, branch.name)) {
    throw new Error(`${branch.name} is already checked out in another worktree. Open a thread in that worktree instead.`)
  }
  if (!branch.behind) return
  const ref = `refs/heads/${branch.name}`
  const old = await git.ok(main, ['rev-parse', '--verify', ref], { what: `Couldn't read ${branch.name}` })
  await git.ok(main, ['update-ref', ref, branch.head, old], { what: `Couldn't bring ${branch.name} up to date with #${pull.number}` })
}
