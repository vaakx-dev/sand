import type { GitRunner } from '@sand/git/contract'
import { plural } from '@sand/util'
import { existsSync } from 'node:fs'
import type { RemoveCheck } from '../contract'
import type { WorktreeDeps } from '../deps'
import { changedFiles } from '../move/carry'
import type { WorktreeRecord } from '../records/schema'
import { branchExists, currentBranch } from '../repo/refs'
import { threadsIn } from '../sessions/inside'

export const unpushedCommits = async (git: GitRunner, dir: string, rev: string, branch?: string) => {
  const others = branch ? [`--exclude=${branch}`, '--branches'] : ['--branches']
  const count = await git.ok(dir, ['rev-list', '--count', rev, '--not', '--remotes', ...others], { read: true, what: "Couldn't count unpushed commits" })
  return Number(count) || 0
}

const lostCommits = async (git: GitRunner, record: WorktreeRecord) => {
  if (existsSync(record.path)) return unpushedCommits(git, record.path, 'HEAD', await currentBranch(git, record.path))
  if (record.branch && (await branchExists(git, record.main, record.branch))) return unpushedCommits(git, record.main, `refs/heads/${record.branch}`, record.branch)
  return 0
}

export const removeCheck = async (deps: WorktreeDeps, record: WorktreeRecord): Promise<RemoveCheck> => ({
  running: threadsIn(deps.sessions, record.path).some(session => deps.busy(session.id)),
  uncommitted: existsSync(record.path) ? await changedFiles(deps.git, record.path) : 0,
  unpushed: await lostCommits(deps.git, record),
})

export const lossMessage = ({ running, uncommitted, unpushed }: RemoveCheck) => {
  if (running) return 'A thread is working in this worktree. Stop it first.'
  const losses = [
    uncommitted ? plural(uncommitted, 'uncommitted file') : '',
    unpushed ? `${plural(unpushed, 'commit')} that ${unpushed === 1 ? "isn't" : "aren't"} on any remote or other branch` : '',
  ].filter(Boolean)
  return `Removing it would lose ${losses.join(' and ')}.`
}
