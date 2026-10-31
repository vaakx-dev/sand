import type { GitHub } from '@sand/github/contract'
import type { ReviewEvent } from '../contract'
import type { PendingOnGitHub } from './read'

export interface Submission {
  event: ReviewEvent
  body?: string
}

const submitPending = `mutation SubmitReview($review: ID!, $event: PullRequestReviewEvent!, $body: String) {
  submitPullRequestReview(input: { pullRequestReviewId: $review, event: $event, body: $body }) { clientMutationId }
}`

const submitNew = `mutation SubmitNewReview($pull: ID!, $event: PullRequestReviewEvent!, $body: String) {
  addPullRequestReview(input: { pullRequestId: $pull, event: $event, body: $body }) { clientMutationId }
}`

const checkSubmission = (pending: PendingOnGitHub, event: ReviewEvent, body: string) => {
  if (event === 'REQUEST_CHANGES' && !body) throw new Error('Requesting changes needs a summary that says what to change.')
  if (event === 'COMMENT' && !body && !pending.comments.length) throw new Error('Add a comment or a summary before submitting the review.')
}

export const submitReview = async (github: GitHub, pending: PendingOnGitHub, { event, body }: Submission) => {
  const text = body?.trim() ?? ''
  checkSubmission(pending, event, text)
  const variables = { event, body: text || null }
  if (pending.review) await github.graphql(submitPending, { review: pending.review, ...variables })
  else await github.graphql(submitNew, { pull: pending.pull, ...variables })
}
