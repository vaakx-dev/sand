import type { LoadedPull } from '../detail/fetch'
import type { Action } from './action'

export interface ResolveInput {
  thread: string
  resolved: boolean
}

const resolveThread = `
mutation ResolveThread($thread: ID!) {
  resolveReviewThread(input: { threadId: $thread }) { clientMutationId }
}
`

const unresolveThread = `
mutation UnresolveThread($thread: ID!) {
  unresolveReviewThread(input: { threadId: $thread }) { clientMutationId }
}
`

const threadIn = ({ detail }: LoadedPull, id: string) => detail.conversation.find(item => item.kind === 'thread' && item.id === id)

export const resolve: Action<ResolveInput> = {
  doing: ({ resolved }) => (resolved ? 'resolve a conversation on' : 'reopen a conversation on'),
  needed(pull, { thread, resolved }) {
    const found = threadIn(pull, thread)
    return found?.kind !== 'thread' || found.resolved !== resolved
  },
  run: (github, _pull, { thread, resolved }) => github.graphql(resolved ? resolveThread : unresolveThread, { thread }),
}
