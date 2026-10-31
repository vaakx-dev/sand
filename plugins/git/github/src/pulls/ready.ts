import type { Client } from '../api/client'
import { GitHubError } from '../api/errors'
import type { PullRef, PullSummary } from '../contract'
import type { Summaries } from './cache'
import { refLabel } from './ref'

const markReady = `
mutation MarkReady($id: ID!) {
  markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId }
}
`

const markDraft = `
mutation MarkDraft($id: ID!) {
  convertPullRequestToDraft(input: { pullRequestId: $id }) { clientMutationId }
}
`

export const setReady = async (client: Client, summaries: Summaries, ref: PullRef, ready: boolean): Promise<PullSummary> => {
  const pull = await summaries.get(ref, true)
  if (pull.state === 'merged' || pull.state === 'closed') throw new GitHubError(`${refLabel(pull)} is ${pull.state}, so it can't change to ${ready ? 'ready' : 'draft'}.`)
  if ((pull.state === 'open') === ready) return pull
  const id = await summaries.id(pull)
  await client.graphql(ready ? markReady : markDraft, { id }).catch((error: unknown) => {
    if (!(error instanceof GitHubError)) throw error
    throw new GitHubError(`Couldn't mark ${refLabel(pull)} as ${ready ? 'ready for review' : 'a draft'}. ${error.message}`, error.status, error.kind)
  })
  return summaries.refresh(ref)
}
