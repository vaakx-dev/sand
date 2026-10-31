import { type MergeSettings, mergeSettingsFields, type PullNode, pullSummaryFields } from '@sand/github/summary'

export const searchQuery = `
query PullInbox($search: String!, $first: Int!, $after: String) {
  search(query: $search, type: ISSUE, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        ...PullSummaryFields
        repository { nameWithOwner ${mergeSettingsFields} }
        labels(first: 20) { nodes { name } }
        reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } } } }
      }
    }
  }
}
${pullSummaryFields}`

export interface SearchNode extends PullNode {
  repository: { nameWithOwner: string } & MergeSettings
  labels: { nodes: ({ name: string } | null)[] | null } | null
  reviewRequests: { nodes: ({ requestedReviewer: { login?: string } | null } | null)[] | null } | null
}

export interface SearchData {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
    nodes: (Partial<SearchNode> | null)[] | null
  }
}
