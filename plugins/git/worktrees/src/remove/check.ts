import { pathKey } from '@sand/git/contract'
import type { GitRunner } from '@sand/git-runner/contract'
import { plural } from '@sand/util'
import type { RemoveCheck } from '../contract'
import type { WorktreeDeps } from '../deps'
import { changedFiles } from '../move/carry'
import type { WorktreeRecord } from '../records/schema'
import { threadsIn } from '../sessions/inside'
import { isWorktree } from './leftover'

export interface Tip {
  exists: boolean
  head?: string
  branch?: string
}

export const unpushedCommits = async (git: GitRunner, dir: string, rev: string, branch?: string) => {
  const others = branch ? [`--exclude=${branch}`, '--branches'] : ['--branches']
  const count = await git.ok(dir, ['rev-list', '--count', rev, '--not', '--remotes', ...others], { read: true, what: "Couldn't count unpushed commits" })
  return Number(count) || 0
}

const checkedOut = async (deps: WorktreeDeps, record: WorktreeRecord): Promise<Tip> => {
  const key = pathKey(record.path)
  const tree = (await deps.repos.worktrees(record.main)).find(found => pathKey(found.path) === key)
  return { exists: true, ...(tree?.head && { head: tree.head }), ...(tree?.branch && { branch: tree.branch }) }
}

const branchTip = async (deps: WorktreeDeps, { main, branch }: WorktreeRecord): Promise<Tip> => {
  const [head] = branch ? await deps.git.commits(main, [`refs/heads/${branch}`]) : []
  return { exists: false, ...(head && { head }), ...(branch && { branch }) }
}

export const tipOf = (deps: WorktreeDeps, record: WorktreeRecord) => (isWorktree(record.path) ? checkedOut(deps, record) : branchTip(deps, record))

const lostCommits = (git: GitRunner, record: WorktreeRecord, { exists, head, branch }: Tip) => {
  if (exists) return unpushedCommits(git, record.path, 'HEAD', branch)
  return head && branch ? unpushedCommits(git, record.main, `refs/heads/${branch}`, branch) : 0
}

export const removeCheck = async (deps: WorktreeDeps, record: WorktreeRecord, tip: Tip): Promise<RemoveCheck> => {
  const [uncommitted, unpushed] = await Promise.all([tip.exists ? changedFiles(deps.git, record.path) : 0, lostCommits(deps.git, record, tip)])
  return { running: threadsIn(deps.sessions, record.path).some(session => deps.busy(session.id)), uncommitted, unpushed }
}

export const lossMessage = ({ running, uncommitted, unpushed }: RemoveCheck, keptDays: number) => {
  if (running) return 'A thread is working in this worktree. Stop it first.'
  const unsaved = [
    uncommitted ? plural(uncommitted, 'uncommitted file') : '',
    unpushed ? `${plural(unpushed, 'commit')} that ${unpushed === 1 ? "isn't" : "aren't"} on any remote or other branch` : '',
  ].filter(Boolean)
  return `It has ${unsaved.join(' and ')}. Removing it anyway keeps that work for ${plural(keptDays, 'day')}, and restoring the worktree brings it back.`
}
