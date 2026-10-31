import { pullSummaryFields } from './fields'

export const summaryQuery = `
query PullSummary($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) { ...PullSummaryFields }
  }
}
${pullSummaryFields}`

interface StateCount {
  state: string
  count: number
}

export interface CheckRunNode {
  __typename: 'CheckRun'
  name: string
  status: string
  conclusion: string | null
  detailsUrl: string | null
  startedAt: string | null
  completedAt: string | null
  checkSuite: { workflowRun: { workflow: { name: string } | null } | null } | null
}

export interface StatusContextNode {
  __typename: 'StatusContext'
  context: string
  state: string
  targetUrl: string | null
}

export type CheckNode = CheckRunNode | StatusContextNode

export interface CheckCounts {
  checkRunCountsByState: StateCount[] | null
  statusContextCountsByState: StateCount[] | null
  nodes: (CheckNode | null)[] | null
}

export interface PullNode {
  id: string
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isDraft: boolean
  headRefName: string
  baseRefName: string
  baseRepository: { nameWithOwner: string } | null
  author: { login: string } | null
  updatedAt: string
  additions: number
  deletions: number
  changedFiles: number
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  mergeStateStatus: string
  autoMergeRequest: { mergeMethod: 'MERGE' | 'SQUASH' | 'REBASE' } | null
  reviewThreads: { nodes: ({ isResolved: boolean } | null)[] | null }
  commits: { nodes: ({ commit: { statusCheckRollup: { contexts: CheckCounts } | null } } | null)[] | null }
}

export interface SummaryData {
  repository: { pullRequest: PullNode | null } | null
}
