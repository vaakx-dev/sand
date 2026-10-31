import type { GitHub } from '@sand/github/contract'
import type { ReviewSide } from '../contract'
import type { PendingOnGitHub } from './read'

export interface NewComment {
  path: string
  line: number
  startLine?: number
  side: ReviewSide
  body: string
}

const startReview = `mutation StartReview($pull: ID!) {
  addPullRequestReview(input: { pullRequestId: $pull }) { pullRequestReview { id } }
}`

const addThread = `mutation AddReviewThread($review: ID!, $path: String!, $line: Int!, $side: DiffSide!, $startLine: Int, $startSide: DiffSide, $body: String!) {
  addPullRequestReviewThread(input: { pullRequestReviewId: $review, path: $path, line: $line, side: $side, startLine: $startLine, startSide: $startSide, body: $body }) {
    thread { comments(first: 1) { nodes { id } } }
  }
}`

interface StartData {
  addPullRequestReview: { pullRequestReview: { id: string } | null } | null
}

interface ThreadData {
  addPullRequestReviewThread: { thread: { comments: { nodes: { id: string }[] } } | null } | null
}

const reviewOf = async (github: GitHub, pending: PendingOnGitHub) => {
  if (pending.review) return pending.review
  const data = await github.graphql<StartData>(startReview, { pull: pending.pull })
  const id = data.addPullRequestReview?.pullRequestReview?.id
  if (!id) throw new Error("GitHub didn't start a review.")
  return id
}

const rangeOf = ({ line, startLine, side }: NewComment) => {
  if (startLine === undefined || startLine === line) return { startLine: null, startSide: null }
  if (startLine > line) throw new Error(`A comment's first line (${startLine}) must come before its last line (${line}).`)
  return { startLine, startSide: side }
}

export const addComment = async (github: GitHub, pending: PendingOnGitHub, comment: NewComment) => {
  const range = rangeOf(comment)
  const review = await reviewOf(github, pending)
  const data = await github.graphql<ThreadData>(addThread, { review, path: comment.path, line: comment.line, side: comment.side, body: comment.body, ...range })
  const id = data.addPullRequestReviewThread?.thread?.comments.nodes[0]?.id
  if (!id) throw new Error(`GitHub didn't add the comment on ${comment.path}:${comment.line}. Check that the line is part of the change.`)
  return id
}
