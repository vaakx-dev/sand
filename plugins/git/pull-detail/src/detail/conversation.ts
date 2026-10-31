import type { ConversationItem, PullComment } from '../contract'
import { isBot, loginOf, present } from './nodes'
import type { PagedLists } from './pages'
import type { RawComment, RawReview, RawThread } from './raw'
import { reviewerState } from './review-state'

const commentOf = (raw: RawComment): PullComment => ({
  id: raw.id,
  author: loginOf(raw.author),
  body: raw.body,
  at: Date.parse(raw.createdAt),
  mine: raw.viewerDidAuthor,
  bot: isBot(raw.author),
})

const reviewItem = (raw: RawReview): ConversationItem | undefined => {
  const state = reviewerState(raw.state)
  if (!state || state === 'pending' || !raw.submittedAt || !raw.body.trim()) return undefined
  return { kind: 'review', id: raw.id, author: loginOf(raw.author), state, body: raw.body, at: Date.parse(raw.submittedAt), bot: isBot(raw.author) }
}

const threadItem = (raw: RawThread): ConversationItem | undefined => {
  const comments = present(raw.comments.nodes).filter(comment => comment.state !== 'PENDING')
  const first = comments[0]
  if (!first) return undefined
  const line = raw.line ?? raw.originalLine
  return {
    kind: 'thread',
    id: raw.id,
    path: raw.path,
    ...(line === null ? {} : { line }),
    resolved: raw.isResolved,
    outdated: raw.isOutdated,
    hunk: first.diffHunk,
    comments: comments.map(commentOf),
    at: Date.parse(first.createdAt),
  }
}

export const conversationOf = ({ comments, reviews, threads }: PagedLists): ConversationItem[] =>
  [
    ...comments.map((raw): ConversationItem => ({ kind: 'comment', ...commentOf(raw) })),
    ...reviews.map(reviewItem),
    ...threads.map(threadItem),
  ]
    .filter((item): item is ConversationItem => item !== undefined)
    .sort((a, b) => a.at - b.at)
