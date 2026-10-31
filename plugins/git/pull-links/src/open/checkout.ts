import type { Session } from '@sand/chats/contract'
import type { GitRunner } from '@sand/git/contract'
import type { PullSummary } from '@sand/github/contract'
import { plural } from '@sand/util'
import { readActivity } from '../activity/read'
import { preparePullBranch } from './branch'
import { gitStep } from './git'
import type { OpenDeps } from './open'

const switchTo = async (git: GitRunner, main: string, name: string) => {
  const args = ['switch', '--quiet', name]
  const result = await git.run(main, args)
  if (result.code === 0) return
  if (/already (checked out|used by worktree)/i.test(`${result.out}\n${result.err}`)) {
    throw new Error(`${name} is already checked out in another worktree. Open a thread in that worktree instead.`)
  }
  const { message, detail } = git.classify(result, args)
  throw new Error(`Couldn't switch ${main} to ${name}: ${message}${detail ? `\n${detail}` : ''}`)
}

export const openInCheckout = async (deps: OpenDeps, main: string, pull: PullSummary): Promise<Session> => {
  const local = await deps.repos.local(main)
  if (!local.repo) throw new Error(`${main} isn't a git repository.`)
  if (local.fileCount > 0) {
    throw new Error(`The main checkout at ${main} has ${plural(local.fileCount, 'uncommitted change')}. Commit or stash them first, or open #${pull.number} in a new worktree.`)
  }
  const head = await readActivity(deps.github, pull)
  const branch = await preparePullBranch(deps.git, main, pull, head)
  if (local.branch !== branch.name) await switchTo(deps.git, main, branch.name)
  if (branch.behind) await gitStep(deps.git, main, ['merge', '--ff-only', '--quiet', branch.head], `Couldn't bring ${branch.name} up to date with #${pull.number}`)
  await deps.repos.refresh(main)
  return deps.sessions.thread(main)
}
