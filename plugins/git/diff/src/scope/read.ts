import type { GitEnv, GitRunner } from '@sand/git/contract'
import { literalPaths, withUntracked, type WorktreeRead } from '../worktree/untracked'
import type { Range } from './resolve'

const plainDiff = ['-c', 'diff.suppressBlankEmpty=false', 'diff', '--no-color', '--no-ext-diff', '--no-textconv', '--no-relative', '--submodule=short', '-M']

export const diffArgs = (range: Range, format: string[], paths: string[] = []) => [
  ...plainDiff,
  ...format,
  range.from,
  ...(range.to ? [range.to] : []),
  '--',
  ...paths,
]

export const readRange = async <T>(git: GitRunner, range: Range, paths: string[], work: (env: GitEnv) => Promise<T>): Promise<WorktreeRead<T>> =>
  range.to ? { value: await work(literalPaths), truncated: false } : withUntracked(git, range.repo.root, paths, work)
