import { tokensOf } from '@sand/usage/records'
import { dollars, tokens } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import { onPlanOf, type Metric } from '../../format'
import { isSubscription } from '../../names'

type Figure = [label: string, value: string]

const costFigures = ({ accounts, total }: Merged): Figure[] => {
  const planned = accounts.filter(isSubscription).reduce((sum, account) => sum + onPlanOf(account), 0)
  return [
    ['Billed to you', dollars(total.billed)],
    ['Covered by plans', planned > 0.005 ? `≈${dollars(planned)}` : dollars(0)],
    ['At API prices', dollars(total.cost)],
  ]
}

const tokenFigures = ({ total }: Merged): Figure[] => [
  ['Tokens', tokens(tokensOf(total.usage))],
  ['Output', tokens(total.usage.output)],
  ['Cache reads', tokens(total.usage.cacheRead)],
]

export const figures = ({ metaLine }: Kit, usage: Merged, metric: Metric) =>
  div(
    { class: 'grid grid-cols-3 gap-4' },
    (metric === 'cost' ? costFigures(usage) : tokenFigures(usage)).map(([label, value]) =>
      div({ class: 'flex min-w-0 flex-col gap-1' }, metaLine(label), span({ class: 'truncate text-xl font-medium text-neutral-100 tabular-nums' }, value)),
    ),
  )
