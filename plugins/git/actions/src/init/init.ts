import { existsSync } from 'node:fs'
import type { GitActionResult } from '../contract'
import { failedRun, failure } from '../run/failure'
import type { FolderJob } from '../run/perform'
import { readRepo } from '../run/repo'

export const initRepo = async ({ git, cwd, progress }: FolderJob): Promise<GitActionResult<{ branch: string }>> => {
  if (!cwd || !existsSync(cwd)) return failure('not-found', "This folder doesn't exist.")
  if (await readRepo(git, cwd)) return failure('unknown', 'This folder is already in a git repository.')
  progress.phase('init')
  const args = ['init']
  const result = await git.run(cwd, args)
  if (result.code !== 0) return failedRun(git, result, args)
  const branch = await git.maybe(cwd, ['symbolic-ref', '--short', 'HEAD'], { read: true })
  return { ok: true, branch: branch || 'main' }
}
