import { type Check, type GitHub, type PullRef, readChecks } from '@sand/github/contract'

export type PullStatus = 'open' | 'closed' | 'merged'

export interface Author {
  login: string
}

export interface Review {
  id: number
  user: Author | null
  state: string
  body: string | null
  html_url: string
}

export interface ReviewComment {
  id: number
  pull_request_review_id: number | null
  user: Author | null
  path: string
  line: number | null
  original_line: number | null
  body: string
  html_url: string
}

export interface IssueComment {
  id: number
  user: Author | null
  body: string
  html_url: string
}

interface Pull {
  title: string
  state: 'open' | 'closed'
  merged: boolean
  mergeable: boolean | null
  html_url: string
  head: { sha: string }
  base: { ref: string }
}

export interface Snapshot {
  title: string
  url: string
  status: PullStatus
  head: string
  base: string
  conflict?: boolean
  checks: Check[]
  reviews: Review[]
  reviewComments: ReviewComment[]
  comments: IssueComment[]
}

const statusOf = (pull: Pull): PullStatus => {
  if (pull.merged) return 'merged'
  return pull.state
}

const sinceQuery = (after: string | undefined) => (after ? `&since=${encodeURIComponent(after)}` : '')

const submitted = (review: Review) => review.state !== 'PENDING'

export const readPull = async (github: Pick<GitHub, 'rest'>, { repo, number }: PullRef, since: string | undefined): Promise<Snapshot> => {
  const path = `/repos/${repo}`
  const pull = await github.rest<Pull>('GET', `${path}/pulls/${number}`)
  const after = sinceQuery(since)
  const [checks, reviews, reviewComments, comments] = await Promise.all([
    readChecks(github, path, pull.head.sha),
    github.rest<Review[]>('GET', `${path}/pulls/${number}/reviews?per_page=100`),
    github.rest<ReviewComment[]>('GET', `${path}/pulls/${number}/comments?per_page=100${after}`),
    github.rest<IssueComment[]>('GET', `${path}/issues/${number}/comments?per_page=100${after}`),
  ])
  return {
    title: pull.title,
    url: pull.html_url,
    status: statusOf(pull),
    head: pull.head.sha,
    base: pull.base.ref,
    ...(pull.mergeable !== null && { conflict: !pull.mergeable }),
    checks,
    reviews: reviews.filter(submitted),
    reviewComments,
    comments,
  }
}
