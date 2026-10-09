import type { UsageSummary } from '@sand/protocol'
import { div, section } from '@sand/dom'
import { dollars, tokens, tokensOf } from '@sand/kit'
import type { Metric } from '../../format'
import { heading, metric as metricTile } from '../parts'

const tilesFor = ({ total }: UsageSummary, metric: Metric): [string, string][] => {
  const { input, cacheRead, cacheWrite, output } = total.usage
  if (metric === 'tokens')
    return [
      ['Processed tokens', tokens(tokensOf(total.usage))],
      ['Input', tokens(input)],
      ['Cache read', tokens(cacheRead)],
      ['Cache write', tokens(cacheWrite)],
      ['Output', tokens(output)],
    ]
  const planned = Math.max(0, total.cost - total.billed)
  return [
    ['Billed to you', dollars(total.billed)],
    ['Covered by plans', planned ? `≈${dollars(planned)}` : dollars(0)],
    ['Processed tokens', tokens(tokensOf(total.usage))],
    ['Cache read', tokens(cacheRead)],
    ['Output', tokens(output)],
  ]
}

export const totalsView = (summary: UsageSummary, metric: Metric) =>
  section(
    { class: 'flex flex-col gap-3' },
    heading('Totals'),
    div(
      { class: 'grid grid-cols-2 gap-4 sm:grid-cols-5' },
      tilesFor(summary, metric).map(([label, value]) => metricTile(label, value)),
    ),
  )
