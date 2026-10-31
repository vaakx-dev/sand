import type { Action } from './action'

export interface ReplyInput {
  thread?: string
  body: string
}

const threadReply = `
mutation ReplyToThread($thread: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $thread, body: $body }) { clientMutationId }
}
`

const issueComment = `
mutation CommentOnPull($subject: ID!, $body: String!) {
  addComment(input: { subjectId: $subject, body: $body }) { clientMutationId }
}
`

export const reply: Action<ReplyInput> = {
  doing: 'post your reply on',
  refuse: (_pull, { body }) => (body.trim() ? undefined : 'Write something before sending the reply.'),
  run: (github, pull, { thread, body }) =>
    thread ? github.graphql(threadReply, { thread, body }) : github.graphql(issueComment, { subject: pull.ids.pull, body }),
}
