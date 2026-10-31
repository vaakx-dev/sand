import { gitOk } from '../run/run'
import type { GitFile, GitRepoLocal } from '../contract'
import { readDefaultBranch } from './default-branch'
import type { Layout } from './layout'
import { type LineCounts, readLineCounts } from './numstat'
import { parseStatus } from './porcelain'
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

export const readLocal = async (layout: Layout): Promise<GitRepoLocal> => {
  const { root } = layout
  const [out, defaultBranch] = await Promise.all([gitOk(root, statusArgs, { read: true }), readDefaultBranch(root)])
  const { head, files } = parseStatus(out)
  const counted = await countUntracked(root, withCounts(files, await readLineCounts(root, head.unborn)))
  return {
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
}
