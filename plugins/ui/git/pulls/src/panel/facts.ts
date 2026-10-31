import { isLivePull } from '@sand/github/look'
import type { PullSummary, ReviewState } from '@sand/github/contract'
import type { IconName, Kit, Tone } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { mergeBlock, mergeText, reviewText } from '../pull/facts'
import { panelLine } from './line'

const reviewTones: Record<ReviewState, Tone> = { approved: 'success', changes: 'warning', required: 'neutral', none: 'neutral' }

const factLine = (kit: Kit, glyph: IconName, tone: Tone, label: string, value: string) =>
  panelLine(
    kit.statusLine({ mark: span({ class: ['inline-flex shrink-0', kit.toneText[tone]] }, kit.icon(glyph, 14)), text: value, title: `${label}: ${value}` }),
  )

const mergeTone = (summary: PullSummary): Tone => (summary.autoMerge || mergeBlock(summary) ? 'neutral' : 'success')

export const factRows = (kit: Kit, summary: PullSummary) =>
  div(
    { class: 'flex flex-col gap-1' },
    factLine(kit, 'users', reviewTones[summary.review], 'Review', reviewText(summary)),
    isLivePull(summary.state) ? factLine(kit, 'merge', mergeTone(summary), 'Merge', mergeText(summary)) : null,
  )
