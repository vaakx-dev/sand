import type { GitRunner } from '@sand/git/contract'
import type { PullSummary } from '@sand/github/contract'
import type { PullActivity } from '../activity/types'
import { gitStep, hasBranch, hasCommit, isAncestor, longGitMs } from './git'

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

const fetchHead = async (git: GitRunner, main: string, pull: PullSummary, sha: string) => {
  const args = ['fetch', '--quiet', '--no-tags', 'origin', `refs/pull/${pull.number}/head`]
  await gitStep(git, main, args, `Couldn't fetch #${pull.number} from origin`, { timeoutMs: longGitMs })
  if (!(await hasCommit(git, main, sha))) throw new Error(`#${pull.number} moved while it was being fetched. Try again.`)
}

const createBranch = async (git: GitRunner, main: string, name: string, sha: string, head: HeadInfo) => {
  await gitStep(git, main, ['branch', '--no-track', name, sha], `Couldn't create the branch ${name}`)
  if (head.fork) return
  await gitStep(git, main, ['config', `branch.${name}.remote`, 'origin'], `Couldn't set ${name} to push to origin`)
  await gitStep(git, main, ['config', `branch.${name}.merge`, `refs/heads/${head.headBranch}`], `Couldn't set ${name} to push to origin`)
}

export const preparePullBranch = async (git: GitRunner, main: string, pull: PullSummary, head: PullActivity): Promise<PullBranch> => {
  const name = branchName(pull, head)
  await fetchHead(git, main, pull, head.head)
  if (!(await hasBranch(git, main, name))) {
    await createBranch(git, main, name, head.head, head)
    return { name, head: head.head, behind: false }
  }
  if (await isAncestor(git, main, head.head, `refs/heads/${name}`)) return { name, head: head.head, behind: false }
  if (await isAncestor(git, main, `refs/heads/${name}`, head.head)) return { name, head: head.head, behind: true }
  throw new Error(`Your local ${name} and #${pull.number} have both moved on. Merge or reset ${name} before opening the pull request here.`)
}

const checkedOut = async (git: GitRunner, main: string, name: string) => {
  const listed = await gitStep(git, main, ['worktree', 'list', '--porcelain'], "Couldn't list the worktrees")
  return listed.split(/\r?\n/).includes(`branch refs/heads/${name}`)
}

export const freeBranch = async (git: GitRunner, main: string, pull: PullSummary, branch: PullBranch) => {
  if (await checkedOut(git, main, branch.name)) {
    throw new Error(`${branch.name} is already checked out in another worktree. Open a thread in that worktree instead.`)
  }
  if (!branch.behind) return
  const ref = `refs/heads/${branch.name}`
  const old = await gitStep(git, main, ['rev-parse', '--verify', ref], `Couldn't read ${branch.name}`)
  await gitStep(git, main, ['update-ref', ref, branch.head, old], `Couldn't bring ${branch.name} up to date with #${pull.number}`)
}
