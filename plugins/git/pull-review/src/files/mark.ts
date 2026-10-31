import type { GitHub, PullRef } from '@sand/github/contract'
import type { PullNodes } from '../pull/node'

const mark = `mutation MarkViewed($pull: ID!, $path: String!) {
  markFileAsViewed(input: { pullRequestId: $pull, path: $path }) { clientMutationId }
}`

const unmark = `mutation UnmarkViewed($pull: ID!, $path: String!) {
  unmarkFileAsViewed(input: { pullRequestId: $pull, path: $path }) { clientMutationId }
}`

export const markViewed = async (github: GitHub, nodes: PullNodes, ref: PullRef, path: string, viewed: boolean) => {
  const pull = await nodes.id(ref)
  await github.graphql(viewed ? mark : unmark, { pull, path })
}
