import type { GitHub, PullRef } from '@sand/github/contract'

const mark = `mutation MarkViewed($pull: ID!, $path: String!) {
  markFileAsViewed(input: { pullRequestId: $pull, path: $path }) { clientMutationId }
}`

const unmark = `mutation UnmarkViewed($pull: ID!, $path: String!) {
  unmarkFileAsViewed(input: { pullRequestId: $pull, path: $path }) { clientMutationId }
}`

export const markViewed = async (github: GitHub, ref: PullRef, path: string, viewed: boolean) => {
  const pull = await github.nodeId(ref)
  await github.graphql(viewed ? mark : unmark, { pull, path })
}
