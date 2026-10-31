import type { GitFailure, GitProblem, GitResult, GitRunner } from '@sand/git/contract'
import { capital, errorMessage } from '@sand/util'
import type { GitActionFailure } from '../contract'
import { outputTail } from './output'

export interface Explained {
  reason?: GitFailure
  message: string
}

export type Explain = (problem: GitProblem, result: GitResult) => Explained | undefined

const general: Partial<Record<GitFailure, string>> = {
  'not-a-repo': "This folder isn't a git repository.",
  auth: "Git couldn't sign in to the remote. Check your credentials and try again.",
  locked: 'Another git command is using this repository. Try again in a moment.',
}

const sentence = (text: string) => {
  const trimmed = capital(text.trim())
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

export const failure = (reason: GitFailure, message: string, output?: string): GitActionFailure => ({
  ok: false,
  reason,
  message,
  ...(output ? { output } : {}),
})

const plain = (problem: GitProblem) => general[problem.reason] ?? sentence(problem.message)

export const failedRun = (git: GitRunner, result: GitResult, args: string[], explain?: Explain): GitActionFailure => {
  const problem = git.classify(result, args)
  const own = explain?.(problem, result)
  return failure(own?.reason ?? problem.reason, own?.message ?? plain(problem), outputTail(result))
}

export const failedThrow = (git: GitRunner, error: unknown): GitActionFailure => {
  const problem = git.problem(error)
  return problem ? failure(problem.reason, plain(problem)) : failure('unknown', sentence(errorMessage(error)))
}
