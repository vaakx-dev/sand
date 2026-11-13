import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import type { Metric } from '../../format'
import type { UsageModel } from '../../model'
import { pageRanges } from '../../prefs'
import { rangeLabel } from '../../range'
import { plot } from '../chart/plot'
import { seriesOf } from '../chart/series'
import { billing, headline, modelList, tokenFigures } from './figures'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
]

const controls = ({ segmented }: Kit, model: UsageModel) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    segmented(
      pageRanges.map(value => ({ value, label: rangeLabel(value) })),
      model.range,
      value => model.range.set(value),
      { label: 'Period' },
    ),
    segmented(METRICS, model.metric, value => model.metric.set(value), { label: 'Measure' }),
  )

const sectionHead = (kit: Kit, model: UsageModel) =>
  div({ class: 'mb-4 flex flex-wrap items-center gap-x-2 gap-y-3' }, kit.sectionTitle('Spend'), span({ class: 'flex-1' }), controls(kit, model))

const overview = (kit: Kit, usage: Merged, metric: Metric) => {
  const { keys, series } = seriesOf(kit, usage, metric)
  const chart = div(
    { class: 'flex min-w-0 flex-1 flex-col gap-2' },
    span({ class: 'text-sm text-neutral-200' }, metric === 'cost' ? 'Daily cost' : 'Daily tokens'),
    plot(kit, { bucket: usage.bucket, keys, series, metric }),
  )
  const rule = div({ class: 'h-px bg-neutral-700' })
  return div(
    { class: 'flex flex-col gap-6' },
    div(
      { class: 'flex flex-col gap-5 md:flex-row md:gap-8' },
      div({ class: 'flex min-w-0 shrink-0 flex-col gap-5 md:w-64' }, headline(usage, metric), metric === 'cost' ? billing(usage) : null, rule, modelList(series, metric)),
      chart,
    ),
    tokenFigures(kit, usage),
  )
}

export const spendSection = (kit: Kit, usage: Merged, model: UsageModel, metric: Metric) =>
  div(
    { class: 'flex min-w-0 flex-col' },
    sectionHead(kit, model),
    usage.total.turns ? overview(kit, usage, metric) : kit.emptyState({ text: 'No usage in this range.' }),
  )
