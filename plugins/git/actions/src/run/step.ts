import type { GitOptions, GitResult, GitRunner } from '@sand/git/contract'
import type { GitActionFailure } from '../contract'
import { failure } from './failure'
import { outputTail } from './output'

const longStepMs = 10 * 60_000

export interface LongStep {
  result: GitResult
  timedOut: boolean
}

export const runLong = async (git: GitRunner, dir: string, args: string[], options: GitOptions = {}): Promise<LongStep> => {
  const started = Date.now()
  const result = await git.run(dir, args, { ...options, timeoutMs: longStepMs })
  return { result, timedOut: result.code !== 0 && Date.now() - started >= longStepMs }
}

export const tooSlow = (what: string, result: GitResult): GitActionFailure =>
  failure('unknown', `${what} took longer than 10 minutes and was stopped.`, outputTail(result))
