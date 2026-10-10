import { div, span } from '@sand/dom'
import { dollars, tokens, tokensOf } from '@sand/kit'
import type { Merged } from '../data/types'
import { onPlanOf } from '../format'
import { isSubscription } from '../names'
import { muted } from './parts'

const figure = (label: string, value: string) =>
  div({ class: 'flex min-w-0 flex-col gap-1' }, muted(label), span({ class: 'truncate text-2xl font-semibold text-neutral-100 tabular-nums' }, value))

export const headline = (usage: Merged) => {
  const planned = usage.accounts.filter(isSubscription).reduce((sum, account) => sum + onPlanOf(account), 0)
  return div(
    { class: 'grid grid-cols-3 gap-4' },
    figure('Billed to you', dollars(usage.total.billed)),
    figure('Covered by plans', planned > 0.005 ? `≈${dollars(planned)}` : dollars(0)),
    figure('Tokens', tokens(tokensOf(usage.total.usage))),
  )
}
