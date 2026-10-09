import type { ProviderUsage, UsageSummary } from '@sand/protocol'
import { div, icon, span } from '@sand/dom'
import { dollars, plural, tokens, tokensOf, usageCost } from '@sand/kit'
import { billingText, shareText, valueOf, valueText, type Metric } from '../../format'
import { muted, providerMark } from '../parts'

const estimateNote = 'Priced at API rates. Turns on a plan were not billed; ≈ marks those amounts.'

const totalLine = (summary: UsageSummary, metric: Metric) => {
  const { total } = summary
  const parts = [plural(total.threads, 'thread'), metric === 'cost' && 'API estimate', total.unpriced && `${total.unpriced} unpriced`].filter(Boolean)
  return span(
    { class: 'flex items-center gap-1 text-xs text-neutral-500' },
    parts.join(' · '),
    metric === 'cost' ? span({ class: 'inline-flex', title: estimateNote }, icon('info', 12)) : null,
  )
}

const detail = (provider: ProviderUsage, metric: Metric, sum: number) => {
  const share = `${shareText(valueOf(provider, metric), sum)} of ${metric === 'cost' ? 'cost' : 'tokens'}`
  return metric === 'cost' ? `${share} · ${billingText(provider)}` : `${share} · ${usageCost(provider)}`
}

const providerRow = (provider: ProviderUsage, order: number, metric: Metric, sum: number) =>
  div(
    { class: 'flex flex-col gap-1' },
    div(
      { class: 'flex items-baseline justify-between gap-4' },
      span(
        { class: 'flex min-w-0 items-center gap-2 text-sm text-neutral-100' },
        providerMark(provider.id, order),
        span({ class: 'truncate' }, provider.label),
        span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, plural(provider.threads, 'thread')),
      ),
      span({ class: 'shrink-0 text-sm font-medium text-neutral-100 tabular-nums' }, provider.billing === 'local' && metric === 'cost' ? 'Free' : valueText(provider, metric)),
    ),
    muted(detail(provider, metric, sum)),
  )

export const summaryView = (summary: UsageSummary, metric: Metric) => {
  const sum = valueOf(summary.total, metric)
  return div(
    { class: 'flex min-w-0 flex-col gap-5' },
    div(
      { class: 'flex flex-col gap-1' },
      span({ class: 'text-3xl font-semibold text-neutral-100 tabular-nums' }, metric === 'cost' ? dollars(summary.total.cost) : tokens(tokensOf(summary.total.usage))),
      totalLine(summary, metric),
    ),
    summary.providers.flatMap((provider, order) => (provider.turns ? [providerRow(provider, order, metric, sum)] : [])),
  )
}
