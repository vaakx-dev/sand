import type { UsageSummary } from '@sand/protocol'
import { div, span } from '@sand/dom'
import { plural, tokens, tokensOf, usageCost } from '@sand/kit'
import type { Metric } from '../format'
import { label } from './parts'

const tile = (name: string, value: string) =>
  div({ class: 'flex min-w-0 flex-col gap-1' }, label(name), span({ class: 'truncate text-base font-semibold text-neutral-100' }, value))

export const totalsView = (summary: UsageSummary, metric: Metric) => {
  const { total } = summary
  const { input, cacheRead, cacheWrite, output } = total.usage
  const other = metric === 'cost' ? tile('Tokens', tokens(tokensOf(total.usage))) : tile('API cost', usageCost(total))
  return div(
    { class: 'flex flex-col gap-4' },
    div(
      { class: 'flex flex-col gap-1' },
      label(metric === 'cost' ? 'API cost' : 'Tokens'),
      span({ class: 'text-3xl font-semibold text-neutral-100' }, metric === 'cost' ? usageCost(total) : tokens(tokensOf(total.usage))),
      span(
        { class: 'text-xs text-neutral-400' },
        [plural(total.turns, 'turn'), plural(total.threads, 'thread'), total.unpriced && `${total.unpriced} unpriced`].filter(Boolean).join(' · '),
      ),
    ),
    div(
      { class: 'grid grid-cols-3 gap-4 sm:grid-cols-5' },
      other,
      tile('Input', tokens(input)),
      tile('Cache read', tokens(cacheRead)),
      tile('Cache write', tokens(cacheWrite)),
      tile('Output', tokens(output)),
    ),
  )
}
