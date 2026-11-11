import { gitOk } from '@sand/git-runner/contract'
import { changedLines, here } from './folder'

const what = "Couldn't discard the changes"

const untracked = (line: string) => line.startsWith('??')

export const discardFolder = async (cwd: string) => {
  const lines = await changedLines(cwd)
  if (!lines.length) throw new Error('There are no changes to discard.')
  if (!lines.every(untracked)) await gitOk(cwd, ['restore', '--source=HEAD', '--staged', '--worktree', ...here], { what })
  if (lines.some(untracked)) await gitOk(cwd, ['clean', '-d', '--force', '--quiet', ...here], { what })
}
