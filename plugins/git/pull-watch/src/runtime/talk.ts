import type { GitHub, PullRef } from '@sand/github/contract'
import type { PullTalk, Remark, ReviewThread, Said } from '../contract'
import { type IssueComment, type Review, type ReviewComment, submitted, VERDICTS, who } from './read'

const MOST = 100

const htmlComments = /<!--[\s\S]*?-->/g

const readable = (body: string | null) => (body ?? '').replace(/\r\n/g, '\n').replace(htmlComments, '').trim()

const remarkOf = (id: number, author: string, body: string, url: string, at: string | undefined): Remark => ({ id: String(id), author, body, url, at: at ? Date.parse(at) : 0 })

const commentRemark = (comment: ReviewComment | IssueComment) => remarkOf(comment.id, who(comment.user), readable(comment.body), comment.html_url, comment.created_at)

const threadOf = (root: ReviewComment, replies: ReviewComment[]): ReviewThread => {
  const line = root.line ?? root.original_line
  return {
    id: String(root.id),
    path: root.path,
    ...(line && { line }),
    outdated: root.line === null,
    remarks: [root, ...replies].map(commentRemark).filter(remark => remark.body),
  }
}

const threadsOf = (comments: ReviewComment[]) => {
  const replies = Map.groupBy(comments, comment => comment.in_reply_to_id)
  return comments.filter(comment => comment.in_reply_to_id === undefined).map(root => threadOf(root, replies.get(root.id) ?? []))
}

const reviewSaid = (review: Review): Said => ({
  ...remarkOf(review.id, who(review.user), readable(review.body), review.html_url, review.submitted_at),
  ...(VERDICTS[review.state] && { verdict: VERDICTS[review.state] }),
})

const conversationOf = (reviews: Review[], comments: IssueComment[]): Said[] =>
  [
    ...reviews.filter(submitted).map(reviewSaid).filter(said => said.body || (said.verdict && said.verdict !== 'reviewed')),
    ...comments.map(commentRemark).filter(said => said.body),
  ].sort((first, second) => first.at - second.at)

export const readTalk = async (github: Pick<GitHub, 'rest'>, { repo, number }: PullRef): Promise<PullTalk> => {
  const path = `/repos/${repo}`
  const [pull, reviewComments, reviews, comments] = await Promise.all([
    github.rest<{ title: string; html_url: string }>('GET', `${path}/pulls/${number}`),
    github.rest<ReviewComment[]>('GET', `${path}/pulls/${number}/comments?per_page=${MOST}`),
    github.rest<Review[]>('GET', `${path}/pulls/${number}/reviews?per_page=${MOST}`),
    github.rest<IssueComment[]>('GET', `${path}/issues/${number}/comments?per_page=${MOST}`),
  ])
  return {
    repo,
    number,
    title: pull.title,
    url: pull.html_url,
    threads: threadsOf(reviewComments).filter(thread => thread.remarks.length),
    conversation: conversationOf(reviews, comments),
  }
}
