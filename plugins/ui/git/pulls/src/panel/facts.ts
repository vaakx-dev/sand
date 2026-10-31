import type { PullSummary } from '@sand/github/contract'
import { div, span } from '@vaakx-dev/vrui'
import { mergeText, reviewText } from '../pull/facts'

const factRow = (label: string, value: string) =>
  div({ class: 'flex items-center gap-2 text-sm' }, span({ class: 'text-neutral-400' }, label), span({ class: 'ml-auto min-w-0 truncate', title: value }, value))

export const factRows = (summary: PullSummary) => div({ class: 'flex flex-col gap-1' }, factRow('Review', reviewText(summary)), factRow('Merge', mergeText(summary)))
