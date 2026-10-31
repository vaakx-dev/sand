import { pullLabel } from '../pulls/ref'
import type { Action } from './action'
import { isOpen } from './state'

const deleteRef = `
mutation DeleteBranch($ref: ID!) {
  deleteRef(input: { refId: $ref }) { clientMutationId }
}
`

export const deleteBranch: Action<object> = {
  doing: 'delete the branch of',
  fresh: true,
  refuse: ({ detail }) =>
    isOpen(detail) ? `${pullLabel(detail)} is still ${detail.state}; its branch can only be deleted after it's merged or closed.` : undefined,
  needed: ({ ids }) => ids.headRef !== undefined,
  run: (github, { ids }) => github.graphql(deleteRef, { ref: ids.headRef }),
}
