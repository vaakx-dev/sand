import { mergeSettingsFields, pullSummaryFields } from '@sand/github/summary'

const author = 'author { __typename login }'
const pageInfo = 'pageInfo { hasNextPage endCursor }'

export const commentFields = `id body createdAt viewerDidAuthor ${author}`
export const reviewFields = `id body state submittedAt ${author}`
export const threadFields = `
  id
  path
  line
  originalLine
  isResolved
  isOutdated
  comments(first: 100) { nodes { ${commentFields} state diffHunk } }
`

export const detailQuery = `
query PullDetail($owner: String!, $name: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    viewerPermission
    ${mergeSettingsFields}
    pullRequest(number: $number) {
      ...PullSummaryFields
      body
      viewerCanUpdate
      viewerCanMergeAsAdmin
      headRefOid
      headRef { id }
      labels(first: 100) { nodes { name } }
      latestReviews(first: 100) { nodes { state ${author} } }
      latestOpinionatedReviews(first: 100) { nodes { state ${author} } }
      reviewRequests(first: 100) {
        nodes {
          requestedReviewer {
            __typename
            ... on User { login }
            ... on Bot { login }
            ... on Mannequin { login }
            ... on Team { combinedSlug }
          }
        }
      }
      commitList: commits(last: 100) {
        nodes { commit { oid messageHeadline authoredDate author { name user { login } } } }
      }
      comments(first: 100) { ${pageInfo} nodes { ${commentFields} } }
      reviews(first: 100) { ${pageInfo} nodes { ${reviewFields} } }
      threads: reviewThreads(first: 100) { ${pageInfo} nodes { ${threadFields} } }
    }
  }
}
${pullSummaryFields}`

export const pageQuery = (connection: string, fields: string) => `
query PullDetailPage($owner: String!, $name: String!, $number: Int!, $after: String!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      page: ${connection}(first: 100, after: $after) { ${pageInfo} nodes { ${fields} } }
    }
  }
}`
