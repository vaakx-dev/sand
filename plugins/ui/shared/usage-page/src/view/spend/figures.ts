import { dollars, tokens, tokensOf } from '@sand/kit'
import { div, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import { onPlanOf, type Metric } from '../../format'
import { isSubscription } from '../../names'
import { muted } from '../parts'

const figure = (label: string, value: string) =>
  div({ class: 'flex min-w-0 flex-col gap-1' }, muted(label), span({ class: 'truncate text-xl font-semibold sm:text-2xl text-neutral-100 tabular-nums' }, value))

const costFigures = ({ accounts, total }: Merged) => {
  const planned = accounts.filter(isSubscription).reduce((sum, account) => sum + onPlanOf(account), 0)
  return [
    figure('Billed to you', dollars(total.billed)),
    figure('Covered by plans', planned > 0.005 ? `≈${dollars(planned)}` : dollars(0)),
    figure('At API prices', dollars(total.cost)),
  ]
}

const tokenFigures = ({ total }: Merged) => [
  figure('Tokens', tokens(tokensOf(total.usage))),
  figure('Output', tokens(total.usage.output)),
  figure('Cache reads', tokens(total.usage.cacheRead)),
]

export const figures = (usage: Merged, metric: Metric) =>
  div({ class: 'grid grid-cols-3 gap-4' }, metric === 'cost' ? costFigures(usage) : tokenFigures(usage))
