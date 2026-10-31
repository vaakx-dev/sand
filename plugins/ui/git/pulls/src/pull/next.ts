import type { PullSummary } from '@sand/github/contract'
import type { CalloutLook } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { mergeBlock } from './facts'

export type NextKind = 'resolve' | 'fix' | 'answer' | 'ready' | 'merge'

export interface NextStep {
  kind: NextKind
  look: CalloutLook
  title: string
  detail?: string
  action: string
}

const answerTitle = (summary: PullSummary) =>
  summary.review === 'changes' ? 'Changes requested' : `${plural(summary.unresolved, 'open review comment')}`

export const nextStep = (summary: PullSummary): NextStep | undefined => {
  if (summary.state === 'merged' || summary.state === 'closed') return undefined
  if (summary.merge === 'conflict')
    return { kind: 'resolve', look: { tone: 'danger', icon: 'alert' }, title: 'Conflicts', detail: `${summary.base} changed the same lines`, action: 'Resolve' }
  if (summary.checks.state === 'fail') {
    const failed = summary.checks.failed
    return { kind: 'fix', look: { tone: 'danger', icon: 'x' }, title: failed > 0 ? `${plural(failed, 'check')} failed` : 'Checks failed', action: 'Fix' }
  }
  if (summary.review === 'changes' || summary.unresolved > 0)
    return { kind: 'answer', look: { tone: 'warning', icon: 'message' }, title: answerTitle(summary), action: 'Answer' }
  if (summary.state === 'draft')
    return { kind: 'ready', look: { tone: 'neutral', icon: 'pr-draft' }, title: 'Draft', detail: 'Mark it ready when it should get reviews', action: 'Ready for review' }
  return { kind: 'merge', look: { tone: 'neutral', icon: 'merge' }, title: 'Merge', detail: mergeBlock(summary) ?? `Into ${summary.base}`, action: 'Merge' }
}
