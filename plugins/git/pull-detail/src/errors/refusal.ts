import { GitHubError, isForbidden, isMissing, type PullRef, pullLabel } from '@sand/github/contract'
import { errorMessage } from '@sand/util'
import { hintFor } from './hints'

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`)

const whyOf = (error: unknown, ref: PullRef) => {
  const said = error instanceof GitHubError ? error.said : undefined
  const hint = said ? hintFor(said, ref) : undefined
  if (hint) return hint
  if (isForbidden(error)) return `your GitHub account doesn't have permission to do that in ${ref.repo}.`
  if (isMissing(error)) return "GitHub couldn't find it, or your GitHub account can't see it."
  if (said) return `GitHub said: ${sentence(said)}`
  return sentence(errorMessage(error))
}

export const refusal = (doing: string, ref: PullRef, error: unknown) => new Error(`Couldn't ${doing} ${pullLabel(ref)}: ${whyOf(error, ref)}`)

export const missingPull = (ref: PullRef) => new Error(`Pull request ${pullLabel(ref)} doesn't exist, or this PC's GitHub sign-in can't see it.`)
