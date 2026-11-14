import type { Check, CheckOutcome } from '@sand/github/contract'
import { clip, oneLine, plural, shortSha } from '@sand/util'
import type { Change } from '@sand/watches/contract'
import { z } from 'zod'
import { type IssueComment, type PullStatus, type Review, type ReviewComment, type Snapshot, VERDICTS, who } from './read'

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

const STATUS_SUMMARIES: Record<PullStatus, string> = { open: 'Reopened', closed: 'Closed', merged: 'Merged' }

export const seenOf = (state: unknown) => {
  const parsed = seen.safeParse(state)
  return parsed.success ? parsed.data : undefined
}

const verdictOf = (checks: Check[]): CheckOutcome | undefined => {
  if (!checks.length || checks.some(check => check.state === 'running')) return undefined
  return checks.some(check => check.state === 'failed') ? 'failed' : 'passed'
}

const newest = (items: { id: number }[], before: number) => Math.max(before, ...items.map(item => item.id))

const detailOf = (...parts: (string | null | undefined)[]) => clip(parts.filter(Boolean).join('\n\n'), DETAIL_MOST)

const lineOf = (comment: ReviewComment) => comment.line ?? comment.original_line

const placeOf = (comment: ReviewComment) => {
  const line = lineOf(comment)
  return line ? `${comment.path}:${line}` : comment.path
}

export const ciKeyOf = (sha: string, verdict: CheckOutcome) => `ci:${sha}:${verdict}`

const ciChange = (snapshot: Snapshot, verdict: CheckOutcome) => {
  const failed = snapshot.checks.filter(check => check.state === 'failed')
  const names = [...new Set(failed.map(check => check.name))].join(', ')
  return {
    summary: verdict === 'passed' ? 'CI passed' : `CI failed: ${names}`,
    detail: detailOf(`On ${shortSha(snapshot.head)}.`, ...failed.map(check => `${check.name}: ${check.url}`)),
    key: ciKeyOf(snapshot.head, verdict),
  }
}

const reviewChange = (review: Review, comments: ReviewComment[]) => {
  const replied = review.state === 'COMMENTED' && !review.body && comments.length > 0
  const verb = replied ? 'commented' : (VERDICTS[review.state] ?? 'reviewed')
  const count = comments.length ? plural(comments.length, 'comment') : undefined
  return { summary: `${who(review.user)} ${verb}`, detail: detailOf(count, review.body, ...comments.map(comment => `${placeOf(comment)}\n${comment.body}`), review.html_url) }
}

const looseComment = (comment: ReviewComment) => ({ summary: `${who(comment.user)} commented`, detail: detailOf(placeOf(comment), comment.body, comment.html_url) })

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
  ...(snapshot.status !== before.status ? [{ summary: STATUS_SUMMARIES[snapshot.status], detail: `Base: ${snapshot.base}.` }] : []),
  ...(snapshot.status === 'open' && snapshot.conflict && !before.conflict ? [{ summary: 'Merge conflicts', detail: `With ${snapshot.base}.` }] : []),
]

const ciKey = (snapshot: Snapshot) => {
  const verdict = verdictOf(snapshot.checks)
  return verdict && ciKeyOf(snapshot.head, verdict)
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
  const changes: Change[] = found.map(({ summary, detail, key }: { summary: string; detail?: string; key?: string }) => ({
    at,
    from,
    summary: oneLine(summary, 200),
    ...(detail && { detail }),
    ...(key && { key }),
  }))
  return { seen, changes }
}
