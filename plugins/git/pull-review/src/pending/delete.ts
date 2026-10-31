import type { GitHub } from '@sand/github/contract'

const deleteCommentMutation = `mutation DeleteReviewComment($id: ID!) {
  deletePullRequestReviewComment(input: { id: $id }) { clientMutationId }
}`

const deleteReviewMutation = `mutation DeleteReview($id: ID!) {
  deletePullRequestReview(input: { pullRequestReviewId: $id }) { clientMutationId }
}`

export const deleteComment = async (github: GitHub, id: string) => {
  await github.graphql(deleteCommentMutation, { id })
}

export const deleteReview = async (github: GitHub, id: string) => {
  await github.graphql(deleteReviewMutation, { id })
}
