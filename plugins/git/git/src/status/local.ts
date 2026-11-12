import { comparePaths } from '@sand/util'
import { gitOk } from '@sand/git-runner/contract'
import type { GitFile, GitLayout, GitRepoLocal } from '../contract'
import { type LineCounts, numstatArgs, readLineCounts } from './numstat'
import { parseStatus, type Upstream, upstreamOf } from './porcelain'
import { countUntracked } from './untracked'

const maxListed = 2000

const statusArgs = ['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all', '--find-renames']

const withCounts = (files: GitFile[], counts: LineCounts) =>
  files.map(file => {
    const count = counts.get(file.path)
    if (!count) return file
    return { ...file, add: count.add, del: count.del, ...(count.binary ? { binary: true } : {}) }
  })

const total = (files: GitFile[], key: 'add' | 'del') => files.reduce((sum, file) => sum + file[key], 0)

export interface LocalRead {
  local: GitRepoLocal
  upstream?: Upstream
}

export const readLocal = async (layout: GitLayout, defaultBranchOf: Promise<string | undefined>): Promise<LocalRead> => {
  const { root } = layout
  const againstHead = gitOk(root, [...numstatArgs, 'HEAD', '--'], { read: true })
  againstHead.catch(() => undefined)
  const [out, defaultBranch] = await Promise.all([gitOk(root, statusArgs, { read: true }), defaultBranchOf])
  const { head, files } = parseStatus(out)
  const ordered = files.sort((a, b) => comparePaths(a.path, b.path))
  const counted = await countUntracked(root, withCounts(ordered, await readLineCounts(root, head.unborn, againstHead)))
  const local: GitRepoLocal = {
    repo: true,
    root,
    prefix: layout.prefix,
    main: layout.main,
    worktree: layout.worktree,
    branch: head.branch,
    head: head.oid,
    detached: head.branch === undefined,
    defaultBranch,
    isDefault: head.branch !== undefined && head.branch === defaultBranch,
    files: counted.slice(0, maxListed),
    fileCount: counted.length,
    ...(counted.length > maxListed ? { truncated: true } : {}),
    add: total(counted, 'add'),
    del: total(counted, 'del'),
  }
  return { local, upstream: head.oid ? upstreamOf(head) : undefined }
}
