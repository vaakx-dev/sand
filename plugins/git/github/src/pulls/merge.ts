import type { Client } from '../api/client'
import { GitHubError, sentence } from '../api/errors'
import type { MergeMethod, PullRef, PullSummary } from '../contract'
import type { Summaries } from './cache'
import { pullLabel } from './ref'

export interface MergeRequest extends PullRef {
  method: MergeMethod
  auto?: boolean
}

const enableAuto = `
mutation EnableAutoMerge($id: ID!, $method: PullRequestMergeMethod!) {
  enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: $method }) { clientMutationId }
}
`

const blocker = (pull: PullSummary) => {
  if (pull.state === 'draft') return 'it is still a draft; mark it ready for review first'
  if (pull.merge === 'conflict') return `it has conflicts with ${pull.base}`
  if (pull.merge === 'behind') return `it is behind ${pull.base}; update the branch first`
  if (pull.checks.state === 'fail') return 'required checks are failing'
  if (pull.checks.state === 'pending') return 'required checks are still running'
  if (pull.review === 'changes') return 'a reviewer asked for changes'
  if (pull.review === 'required') return 'it needs an approving review'
  return undefined
}

const refused = (error: unknown, pull: PullSummary) => {
  if (!(error instanceof GitHubError)) return error
  const label = pullLabel(pull)
  if (error.status === 409) return new GitHubError(`${label} changed while merging; check the latest commits and try again.`, { status: 409 })
  if (error.status === 405 || error.status === 422) return new GitHubError(`GitHub won't merge ${label}: ${blocker(pull) ?? sentence(error.said ?? error.message)}`, error)
  return error
}

const mergeNow = (client: Client, pull: PullSummary, method: MergeMethod) =>
  client.rest('PUT', `/repos/${pull.repo}/pulls/${pull.number}/merge`, { merge_method: method }).catch((error: unknown) => {
    throw refused(error, pull)
  })

const mergeLater = async (client: Client, summaries: Summaries, pull: PullSummary, method: MergeMethod) => {
  const id = await summaries.id(pull)
  await client.graphql(enableAuto, { id, method: method.toUpperCase() }).catch((error: unknown) => {
    if (!(error instanceof GitHubError)) throw error
    throw new GitHubError(`Couldn't turn on auto-merge for ${pullLabel(pull)}. ${error.message}`, error)
  })
}

export const mergePull = async (client: Client, summaries: Summaries, request: MergeRequest): Promise<PullSummary> => {
  const pull = await summaries.get(request, true)
  if (pull.state === 'merged') return pull
  if (pull.state === 'closed') throw new GitHubError(`${pullLabel(pull)} is closed; reopen it on GitHub to merge it.`)
  if (request.auto && pull.merge !== 'clean') await mergeLater(client, summaries, pull, request.method)
  else await mergeNow(client, pull, request.method)
  return summaries.refresh(request)
}
