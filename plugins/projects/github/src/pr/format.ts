import { byOutcome, checkName, type Outcome } from './checks'
import type { Check, Comment, Pr, PrView, Thread } from './types'

const maxBody = 300
const maxItems = 10

const merge: Record<string, (base: string) => string> = {
  BEHIND: base => `behind ${base}`,
  DIRTY: base => `conflicts with ${base}`,
  CLEAN: () => 'ready',
  BLOCKED: () => 'blocked by required checks or reviews',
  UNSTABLE: () => 'failing checks',
  DRAFT: () => 'draft',
}

const innermostDetails = /<details>(?:(?!<details>)[\s\S])*?<\/details>/g

const withoutDetails = (body: string): string => {
  const next = body.replace(innermostDetails, '')
  return next === body ? body : withoutDetails(next)
}

const clean = (body: string) => {
  const text = withoutDetails(body)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxBody ? `${text.slice(0, maxBody)}…` : text
}

const who = (comment: Comment) => `@${comment.author?.login ?? 'ghost'}`

const lower = (value: string) => value.toLowerCase().replaceAll('_', ' ')

export const headDate = (pr: PrView) => pr.commits.at(-1)?.committedDate ?? ''

export const newFeedback = (pr: PrView) => {
  const since = headDate(pr)
  const comments = pr.comments.filter(comment => comment.createdAt > since && comment.body.trim())
  const reviews = pr.reviews
    .filter(review => review.submittedAt > since && review.body.trim())
    .map(review => ({ author: review.author, body: `${lower(review.state)}: ${review.body}`, createdAt: review.submittedAt }))
  return [...comments, ...reviews].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

const thread = ({ path, line, comments }: Thread) => {
  const first = comments[0]
  const last = comments.at(-1)
  const replies = comments.length > 1 ? ` (${comments.length - 1} replies, last ${last ? who(last) : ''})` : ''
  return `- ${path}${line ? `:${line}` : ''} ${first ? `${who(first)}${replies}: ${clean(first.body)}` : ''}`
}

const list = <T>(title: string, items: T[], line: (item: T) => string) =>
  items.length ? [`${title} (${items.length}):`, ...items.slice(0, maxItems).map(line), ...(items.length > maxItems ? [`- … ${items.length - maxItems} more`] : [])] : []

const names = (checks: Check[]) => [...new Set(checks.map(checkName))].join(', ')

const checks = (pr: Pr) => {
  const count = (outcome: Outcome) => byOutcome(pr.statusCheckRollup, outcome)
  const [passed, failed, cancelled, pending] = [count('passed'), count('failed'), count('cancelled'), count('pending')]
  if (!pr.statusCheckRollup.length) return ['Checks: none']
  const shown = new Set(pr.failures.map(failure => failure.name))
  const rest = failed.filter(check => !shown.has(checkName(check)))
  return [
    `Checks: ${passed.length} passed, ${failed.length} failed, ${pending.length} pending${cancelled.length ? `, ${cancelled.length} cancelled` : ''}`,
    ...pr.failures.flatMap(failure => [`Failed: ${failure.name}${failure.url ? ` ${failure.url}` : ''}`, ...(failure.log ? [failure.log.replace(/^/gm, '  ')] : [])]),
    ...(rest.length ? [`Also failed: ${names(rest)}`] : []),
    ...(pending.length ? [`Pending: ${names(pending)}`] : []),
  ]
}

export const formatPr = (pr: Pr) => {
  const state = [lower(pr.state), ...(pr.isDraft ? ['draft'] : [])].join(', ')
  const mergeState = merge[pr.mergeStateStatus]?.(pr.baseRefName) ?? lower(pr.mergeStateStatus)
  return [
    `#${pr.number} ${pr.title} (${state})`,
    pr.url,
    `${pr.headRefName} → ${pr.baseRefName} · head ${pr.headRefOid.slice(0, 7)} · merge: ${mergeState}${pr.reviewDecision ? ` · review: ${lower(pr.reviewDecision)}` : ''}`,
    ...checks(pr),
    ...list('Unresolved threads', pr.threads, thread),
    ...list(`New comments since ${pr.headRefOid.slice(0, 7)}`, newFeedback(pr), comment => `- ${who(comment)}: ${clean(comment.body)}`),
  ].join('\n')
}
