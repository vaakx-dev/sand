export const pullSummaryFields = `
fragment PullSummaryFields on PullRequest {
  id
  number
  title
  url
  state
  isDraft
  headRefName
  baseRefName
  baseRepository { nameWithOwner }
  author { login }
  updatedAt
  additions
  deletions
  changedFiles
  reviewDecision
  mergeable
  mergeStateStatus
  autoMergeRequest { mergeMethod }
  reviewThreads(first: 100) { nodes { isResolved } }
  commits(last: 1) {
    nodes {
      commit {
        statusCheckRollup {
          contexts(first: 100) {
            checkRunCountsByState { state count }
            statusContextCountsByState { state count }
            nodes {
              __typename
              ... on CheckRun {
                name
                status
                conclusion
                detailsUrl
                startedAt
                completedAt
                checkSuite { workflowRun { workflow { name } } }
              }
              ... on StatusContext {
                context
                state
                targetUrl
              }
            }
          }
        }
      }
    }
  }
}
`
