import type { GitResult, GitRunner } from '@sand/git/contract'
import type { GitActionFailure } from '../contract'
import { hookFailed } from '../hooks/find'
import { failedRun, failure } from '../run/failure'
import { hasGitError, outputTail } from '../run/output'

const nothingStaged = /nothing to commit|nothing added to commit|no changes added to commit/i

export const commitFailed = (git: GitRunner, result: GitResult, args: string[], hooks: string[]): GitActionFailure => {
  const output = outputTail(result)
  if (nothingStaged.test(`${result.out}\n${result.err}`)) return failure('unknown', "There's nothing to commit.", output)
  if (hooks.length && !hasGitError(result)) return failure('hook', hookFailed(hooks, 'committed'), output)
  return failedRun(git, result, args)
}
