import { gitOk } from '@sand/git-runner/contract'

export const here = ['--', '.']

export const read = { read: true }

export const changedLines = async (cwd: string) =>
  (await gitOk(cwd, ['status', '--porcelain', '--untracked-files=all', ...here], read)).split(/\r?\n/).filter(Boolean)
