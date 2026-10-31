import type { MergeSettings, PullNode } from '@sand/github/summary'

export interface RawActor {
  __typename: string
  login: string
}

export interface Connection<T> {
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
  nodes: (T | null)[] | null
}

export interface Nodes<T> {
  nodes: (T | null)[] | null
}

export interface RawComment {
  id: string
  body: string
  createdAt: string
  viewerDidAuthor: boolean
  author: RawActor | null
}

export interface RawThreadComment extends RawComment {
  state: 'PENDING' | 'SUBMITTED'
  diffHunk: string
}

export interface RawReview {
  id: string
  body: string
  state: string
  submittedAt: string | null
  author: RawActor | null
}

export interface RawThread {
  id: string
  path: string
  line: number | null
  originalLine: number | null
  isResolved: boolean
  isOutdated: boolean
  comments: Nodes<RawThreadComment>
}

export interface RawOpinion {
  state: string
  author: RawActor | null
}

export type RawRequested =
  | { __typename: 'User' | 'Bot' | 'Mannequin'; login: string }
  | { __typename: 'Team'; combinedSlug: string }

export interface RawCommit {
  commit: {
    oid: string
    messageHeadline: string
    authoredDate: string
    author: { name: string | null; user: { login: string } | null } | null
  }
}

export interface RawDetail extends PullNode {
  body: string
  viewerCanUpdate: boolean
  viewerCanMergeAsAdmin: boolean
  headRefOid: string
  headRef: { id: string } | null
  labels: Nodes<{ name: string }> | null
  latestReviews: Nodes<RawOpinion> | null
  latestOpinionatedReviews: Nodes<RawOpinion> | null
  reviewRequests: Nodes<{ requestedReviewer: RawRequested | null }> | null
  commitList: Nodes<RawCommit>
  comments: Connection<RawComment>
  reviews: Connection<RawReview> | null
  threads: Connection<RawThread>
}

export interface RawRepo extends MergeSettings {
  viewerPermission: string | null
  pullRequest: RawDetail | null
}

export interface DetailData {
  viewer: { login: string }
  repository: RawRepo | null
}

export interface PageData<T> {
  repository: { pullRequest: { page: Connection<T> | null } | null } | null
}
