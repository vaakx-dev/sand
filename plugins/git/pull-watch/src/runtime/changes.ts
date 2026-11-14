import type { Check } from '@sand/github/contract'
import { clip, oneLine, plural, shortSha } from '@sand/util'
import type { Change } from '@sand/watches/contract'
import { z } from 'zod'
import type { IssueComment, PullStatus, Review, ReviewComment, Snapshot } from './read'

type Verdict = 'passed' | 'failed'

const seen = z.object({
  status: z.enum(['open', 'closed', 'merged']),
  conflict: z.boolean().optional(),
  ci: z.string().optional(),
  review: z.number(),
  reviewComment: z.number(),
  comment: z.number(),
  since: z.string(),
})

export type Seen = z.output<typeof seen>

const DETAIL_MOST = 4_000
const SKEW_MS = 60_000

const REVIEW_VERBS: Record<string, string> = { APPROVED: 'approved', CHANGES_REQUESTED: 'requested changes', COMMENTED: 'reviewed', DISMISSED: 'dismissed a review' }

const STATUS_SUMMARIES: Record<PullStatus, (base: string) => string> = {
  open: () => 'Reopened',
  closed: () => 'Closed without merging',
  merged: base => `Merged into ${base}`,
}

export const seenOf = (state: unknown) => {
  const parsed = seen.safeParse(state)
  return parsed.success ? parsed.data : undefined
}

const verdictOf = (checks: Check[]): Verdict | undefined => {
  if (!checks.length || checks.some(check => check.state === 'running')) return undefined
  return checks.some(check => check.state === 'failed') ? 'failed' : 'passed'
}

const newest = (items: { id: number }[], before: number) => Math.max(before, ...items.map(item => item.id))

const who = (author: { login: string } | null) => author?.login ?? 'ghost'

const detailOf = (...parts: (string | null | undefined)[]) => clip(parts.filter(Boolean).join('\n\n'), DETAIL_MOST)

const lineOf = (comment: ReviewComment) => comment.line ?? comment.original_line

const placeOf = (comment: ReviewComment) => {
  const line = lineOf(comment)
  return line ? `${comment.path}:${line}` : comment.path
}

const ciChange = (snapshot: Snapshot, verdict: Verdict) => {
  const failed = snapshot.checks.filter(check => check.state === 'failed')
  const names = [...new Set(failed.map(check => check.name))].join(', ')
  const summary = verdict === 'passed' ? `CI passed on ${shortSha(snapshot.head)}` : `CI failed on ${shortSha(snapshot.head)}: ${names}`
  return { summary, detail: detailOf(...failed.map(check => `${check.name}: ${check.url}`)) }
}

const reviewChange = (review: Review, comments: ReviewComment[]) => {
  const count = comments.length ? ` (${plural(comments.length, 'comment')})` : ''
  const replied = review.state === 'COMMENTED' && !review.body && comments.length === 1
  const summary = replied && comments[0] ? `${who(review.user)} commented on ${placeOf(comments[0])}` : `${who(review.user)} ${REVIEW_VERBS[review.state] ?? 'reviewed'}${count}`
  return { summary, detail: detailOf(review.body, ...comments.map(comment => `${placeOf(comment)}\n${comment.body}`), review.html_url) }
}

const looseComment = (comment: ReviewComment) => ({ summary: `${who(comment.user)} commented on ${placeOf(comment)}`, detail: detailOf(comment.body, comment.html_url) })

const issueComment = (comment: IssueComment) => ({ summary: `${who(comment.user)} commented`, detail: detailOf(comment.body, comment.html_url) })

const reviewChanges = (before: Seen, snapshot: Snapshot) => {
  const reviews = snapshot.reviews.filter(review => review.id > before.review)
  const comments = snapshot.reviewComments.filter(comment => comment.id > before.reviewComment)
  const grouped = new Set(reviews.map(review => review.id))
  return [
    ...reviews.map(review => reviewChange(review, comments.filter(comment => comment.pull_request_review_id === review.id))),
    ...comments.filter(comment => !grouped.has(comment.pull_request_review_id ?? -1)).map(looseComment),
  ]
}

const stateChanges = (before: Seen, snapshot: Snapshot) => [
  ...(snapshot.status !== before.status ? [{ summary: STATUS_SUMMARIES[snapshot.status](snapshot.base) }] : []),
  ...(snapshot.status === 'open' && snapshot.conflict && !before.conflict ? [{ summary: `Has merge conflicts with ${snapshot.base}` }] : []),
]

const ciKey = (snapshot: Snapshot) => {
  const verdict = verdictOf(snapshot.checks)
  return verdict && `${snapshot.head}:${verdict}`
}

const ciChanges = (before: Seen, snapshot: Snapshot) => {
  const verdict = verdictOf(snapshot.checks)
  if (!verdict || ciKey(snapshot) === before.ci) return []
  return [ciChange(snapshot, verdict)]
}

const nextSeen = (before: Seen | undefined, snapshot: Snapshot, at: number): Seen => ({
  status: snapshot.status,
  conflict: snapshot.conflict ?? before?.conflict,
  ci: ciKey(snapshot) ?? before?.ci,
  review: newest(snapshot.reviews, before?.review ?? 0),
  reviewComment: newest(snapshot.reviewComments, before?.reviewComment ?? 0),
  comment: newest(snapshot.comments, before?.comment ?? 0),
  since: new Date(at - SKEW_MS).toISOString(),
})

export const changesOf = (from: string, before: Seen | undefined, snapshot: Snapshot, at: number) => {
  const seen = nextSeen(before, snapshot, at)
  if (!before) return { seen, changes: [] }
  const found = [
    ...stateChanges(before, snapshot),
    ...ciChanges(before, snapshot),
    ...reviewChanges(before, snapshot),
    ...snapshot.comments.filter(comment => comment.id > before.comment).map(issueComment),
  ]
  const changes: Change[] = found.map(({ summary, detail }: { summary: string; detail?: string }) => ({
    at,
    from,
    summary: oneLine(summary, 200),
    ...(detail && { detail }),
  }))
  return { seen, changes }
}
