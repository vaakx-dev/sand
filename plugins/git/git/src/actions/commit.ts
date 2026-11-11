import { gitOk } from '@sand/git-runner/contract'
import { changedLines, here } from './folder'

const what = "Couldn't commit"

export const commitFolder = async (cwd: string, message: string) => {
  if (!(await changedLines(cwd)).length) throw new Error('There are no changes to commit.')
  await gitOk(cwd, ['add', '--all', ...here], { what })
  await gitOk(cwd, ['commit', '--quiet', '-m', message, ...here], { what })
}
