import { pullLabel } from '@sand/github/contract'
import type { Action } from './action'
import { stateNote } from './state'

export interface CloseInput {
  closed: boolean
}

const closePull = `
mutation ClosePull($id: ID!) {
  closePullRequest(input: { pullRequestId: $id }) { clientMutationId }
}
`

const reopenPull = `
mutation ReopenPull($id: ID!) {
  reopenPullRequest(input: { pullRequestId: $id }) { clientMutationId }
}
`

export const close: Action<CloseInput> = {
  doing: ({ closed }) => (closed ? 'close' : 'reopen'),
  refuse({ detail }, { closed }) {
    if (detail.state === 'merged') return `${stateNote(detail)}, so it can't be closed or reopened.`
    if (!closed && detail.headDeleted) return `The branch ${detail.head} of ${pullLabel(detail)} was deleted, so it can't be reopened; restore the branch on GitHub first.`
    return undefined
  },
  needed: ({ detail }, { closed }) => (detail.state === 'closed') !== closed,
  run: (github, pull, { closed }) => github.graphql(closed ? closePull : reopenPull, { id: pull.ids.pull }),
}
