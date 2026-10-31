import { type GitHub, type PullRef, pullLabel, pullVariables } from '@sand/github/contract'
import type { PendingComment, ReviewSide } from '../contract'

const threadFields = `nodes {
  path diffSide line startLine originalLine originalStartLine
  comments(last: 100) { nodes { id body pullRequestReview { id } } }
}
pageInfo { hasNextPage endCursor }`

const reviewQuery = `query PendingReview($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      reviews(first: 10, states: [PENDING]) { nodes { id viewerDidAuthor } }
      reviewThreads(first: 100) { ${threadFields} }
    }
  }
}`

const moreQuery = `query PendingThreads($pull: ID!, $after: String!) {
  node(id: $pull) { ... on PullRequest { reviewThreads(first: 100, after: $after) { ${threadFields} } } }
}`

interface ThreadNode {
  path: string
  diffSide: ReviewSide
  line: number | null
  startLine: number | null
  originalLine: number | null
  originalStartLine: number | null
  comments: { nodes: { id: string; body: string; pullRequestReview: { id: string } | null }[] }
}

interface ThreadPage {
  nodes: ThreadNode[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

interface ReviewData {
  repository: {
    pullRequest: { id: string; reviews: { nodes: { id: string; viewerDidAuthor: boolean }[] } | null; reviewThreads: ThreadPage } | null
  } | null
}

interface MoreData {
  node: { reviewThreads?: ThreadPage } | null
}

export type StoredComment = Omit<PendingComment, 'byAgent'>

export interface PendingOnGitHub {
  pull: string
  review?: string
  comments: StoredComment[]
}

const maxPages = 30

const placeOf = (thread: ThreadNode) => {
  const line = thread.line ?? thread.originalLine ?? 1
  const startLine = thread.line === null ? thread.originalStartLine : thread.startLine
  return { path: thread.path, line, side: thread.diffSide, ...(startLine && startLine < line ? { startLine } : {}) }
}

const commentsIn = (threads: ThreadNode[], review: string): StoredComment[] =>
  threads.flatMap(thread =>
    thread.comments.nodes.filter(comment => comment.pullRequestReview?.id === review).map(comment => ({ id: comment.id, ...placeOf(thread), body: comment.body })),
  )

const allThreads = async (github: GitHub, pull: string, first: ThreadPage) => {
  const threads = [...first.nodes]
  let page = first
  for (let count = 1; page.pageInfo.hasNextPage && page.pageInfo.endCursor && count < maxPages; count++) {
    const data = await github.graphql<MoreData>(moreQuery, { pull, after: page.pageInfo.endCursor })
    if (!data.node?.reviewThreads) break
    page = data.node.reviewThreads
    threads.push(...page.nodes)
  }
  return threads
}

export const readPending = async (github: GitHub, ref: PullRef): Promise<PendingOnGitHub> => {
  const data = await github.graphql<ReviewData>(reviewQuery, pullVariables(ref))
  const pull = data.repository?.pullRequest
  if (!pull) throw new Error(`GitHub couldn't find ${pullLabel(ref)}.`)
  const review = pull.reviews?.nodes.find(node => node.viewerDidAuthor)
  if (!review) return { pull: pull.id, comments: [] }
  const threads = await allThreads(github, pull.id, pull.reviewThreads)
  return { pull: pull.id, review: review.id, comments: commentsIn(threads, review.id) }
}
