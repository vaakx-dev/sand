import { pullLabel } from '@sand/github/contract'
import type { Action } from './action'
import { isOpen, stateNote } from './state'

export interface UpdateInput {
  rebase?: boolean
}

const updateBranch = `
mutation UpdateBranch($id: ID!, $oid: GitObjectID!, $method: PullRequestBranchUpdateMethod!) {
  updatePullRequestBranch(input: { pullRequestId: $id, expectedHeadOid: $oid, updateMethod: $method }) { clientMutationId }
}
`

export const update: Action<UpdateInput> = {
  doing: ({ rebase }) => (rebase ? 'rebase the branch of' : 'update the branch of'),
  fresh: true,
  refuse({ detail }) {
    if (!isOpen(detail)) return `${stateNote(detail)}, so its branch can't be updated.`
    if (detail.headDeleted) return `The branch ${detail.head} of ${pullLabel(detail)} was deleted, so it can't be updated.`
    if (detail.merge === 'conflict') return `${pullLabel(detail)} has conflicts with ${detail.base}; resolve them in a thread first.`
    return undefined
  },
  needed: ({ detail }) => detail.behindBy !== 0,
  run: (github, { ids }, { rebase }) => github.graphql(updateBranch, { id: ids.pull, oid: ids.headOid, method: rebase ? 'REBASE' : 'MERGE' }),
}
