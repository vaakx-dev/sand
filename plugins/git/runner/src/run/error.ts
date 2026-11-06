import type { GitFailure, GitProblem } from '../contract'

export class GitError extends Error {
  readonly reason: GitFailure
  readonly detail?: string

  constructor(reason: GitFailure, message: string, detail?: string) {
    super(message)
    this.name = 'GitError'
    this.reason = reason
    if (detail !== undefined) this.detail = detail
  }
}

export const problemOf = (error: GitError): GitProblem => {
  const problem: GitProblem = { reason: error.reason, message: error.message }
  if (error.detail !== undefined) problem.detail = error.detail
  return problem
}

export const problem = (error: unknown): GitProblem | undefined => (error instanceof GitError ? problemOf(error) : undefined)
