const comment = 'author { login } body createdAt'

export const activityQuery = `query PullActivity($owner: String!, $name: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      state
      isDraft
      mergeable
      headRefOid
      headRefName
      isCrossRepository
      headRepositoryOwner { login }
      commits(last: 1) {
        nodes {
          commit {
            statusCheckRollup {
              contexts(first: 100) {
                nodes {
                  __typename
                  ... on CheckRun { name status conclusion }
                  ... on StatusContext { context state }
                }
              }
            }
          }
        }
      }
      reviews(last: 30) { nodes { state ${comment} submittedAt } }
      comments(last: 30) { nodes { ${comment} } }
      reviewThreads(last: 50) {
        nodes {
          isResolved
          path
          line
          comments(last: 10) { nodes { ${comment} } }
        }
      }
    }
  }
}`

interface Author {
  login: string
}

export interface RawComment {
  author: Author | null
  body: string
  createdAt: string
}

export interface RawReview extends RawComment {
  state: string
  submittedAt: string | null
}

export type RawContext =
  | { __typename: 'CheckRun'; name: string; status: string; conclusion: string | null }
  | { __typename: 'StatusContext'; context: string; state: string }

export interface RawThread {
  isResolved: boolean
  path: string
  line: number | null
  comments: { nodes: RawComment[] }
}

export interface RawPull {
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isDraft: boolean
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  headRefOid: string
  headRefName: string
  isCrossRepository: boolean
  headRepositoryOwner: Author | null
  commits: { nodes: { commit: { statusCheckRollup: { contexts: { nodes: RawContext[] } } | null } }[] }
  reviews: { nodes: RawReview[] }
  comments: { nodes: RawComment[] }
  reviewThreads: { nodes: RawThread[] }
}

export interface RawActivity {
  viewer: Author
  repository: { pullRequest: RawPull | null } | null
}
