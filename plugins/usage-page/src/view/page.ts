import type { Limits, UsageSummary, Wire } from '@sand/protocol'
import { clock, delayed, derive, div, dynamicChild, effect, icon, iconButton, segmented, settingsRow, settingsSection, show, sig, spinner, untrack, type Sig } from '@sand/dom'
import type { Metric } from '../format'
import { summaryLoader } from '../load'
import { usagePrefs } from '../prefs'
import { rangeLabels, ranges, type Range } from '../range'
import { breakdownView, type Breakdown } from './breakdown'
import { chartView } from './chart'
import { limitsView } from './limits'
import { block } from './parts'
import { totalsView } from './totals'

export interface UsagePageDeps {
  wire: Wire
  limits(): Limits | undefined
  refreshLimits?(): Promise<void>
  openThread?(id: string): void
}

const rangeChoices = ranges.map(value => ({ value, label: rangeLabels[value] }))
const metricChoices: { value: Metric; label: string }[] = [
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
]

const note = (text: string) => settingsSection({}, settingsRow(text))

const body = (summary: UsageSummary | undefined, metric: Metric, failure: string, breakdown: Sig<Breakdown>, deps: UsagePageDeps) => {
  if (!summary) return failure ? note(failure) : div({ class: 'flex h-24 items-center justify-center text-neutral-500' }, show(delayed(true), () => spinner(16)))
  if (!summary.total.turns) return note('No usage in this range')
  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection({}, block(totalsView(summary, metric), chartView(summary, metric))),
    breakdownView(summary, metric, breakdown, deps.openThread),
  )
}

export const usagePage = (deps: UsagePageDeps) => {
  const { range, metric } = usagePrefs()
  const breakdown = sig<Breakdown>('models')
  const loader = summaryLoader(deps.wire)
  const now = clock(30_000)
  const reload = () => untrack(() => loader.load(range.get()))

  effect(() => {
    range.get()
    reload()
  })

  return div(
    { class: 'flex w-full flex-col gap-6' },
    limitsView(() => deps.limits() ?? loader.summary.get()?.limits, now, deps.refreshLimits),
    div(
      { class: 'flex flex-wrap items-center gap-2' },
      segmented(rangeChoices, range, (value: Range) => range.set(value)),
      div(
        { class: 'ml-auto flex items-center gap-2' },
        segmented(metricChoices, metric, (value: Metric) => metric.set(value)),
        iconButton({ size: 'sm', title: 'Reload', onClick: reload }, icon('retry', 13)),
      ),
    ),
    div(
      { class: ['transition-opacity', () => (loader.busy.get() && loader.summary.get() ? 'opacity-60' : '')] },
      dynamicChild(
        derive(() => ({ summary: loader.summary.get(), metric: metric.get(), failure: loader.failure.get() })),
        ({ summary, metric, failure }) => body(summary, metric, failure, breakdown, deps),
      ),
    ),
  )
}
