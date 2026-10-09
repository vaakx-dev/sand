import type { UsageSummary } from '@sand/usage/contract'
import { div, section, type Sig } from '@sand/dom'
import type { Metric } from '../../format'
import { heading } from '../parts'
import { breakdownView, type Breakdown } from './breakdown'
import { chartView } from './chart'
import { summaryView } from './summary'
import { totalsView } from './totals'

const chartTitle = (summary: UsageSummary, metric: Metric) =>
  `${summary.bucket === 'hour' ? 'Hourly' : 'Daily'} ${metric === 'cost' ? 'cost' : 'processed tokens'}`

export const spendView = (summary: UsageSummary, metric: Metric, breakdown: Sig<Breakdown>, openThread?: (id: string) => void) =>
  div(
    { class: 'flex flex-col gap-10' },
    section(
      { class: 'flex flex-col gap-8 md:flex-row' },
      div({ class: 'md:w-64 md:shrink-0' }, summaryView(summary, metric)),
      div({ class: 'flex min-w-0 flex-1 flex-col gap-3' }, heading(chartTitle(summary, metric)), chartView(summary, metric)),
    ),
    totalsView(summary, metric),
    breakdownView(summary, metric, breakdown, openThread),
  )
