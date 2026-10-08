import type { PeriodUsage, UsageSummary } from '@sand/protocol'
import { div, dynamicChild, sig, span, strong } from '@sand/dom'
import { periodLabel, periodTitle, plural, tokens, tokensOf, usageCost } from '@sand/kit'
import { metricText, tickText, valueOf, type Metric } from '../format'
import { periodKeys } from '../range'
import { cssPercent, scaleFor } from './scale'

interface Column {
  key: string
  usage?: PeriodUsage
  value: number
}

const tooltip = (summary: UsageSummary, column: Column, index: number, count: number, metric: Metric) => {
  const right = (index + 0.5) / count < 0.5
  const usage = column.usage
  return div(
    {
      class: 'pointer-events-none absolute top-0 z-10 flex flex-col gap-1 rounded-lg bg-neutral-600 px-3 py-2 text-xs whitespace-nowrap shadow-lg',
      style: right ? { left: `calc(${cssPercent((index + 1) / count)} + 6px)` } : { right: `calc(${cssPercent(1 - index / count)} + 6px)` },
    },
    strong({ class: 'text-sm font-semibold text-neutral-100' }, metricText(column.value, metric)),
    span({ class: 'text-neutral-300' }, usage ? [metric === 'cost' ? `${tokens(tokensOf(usage.usage))} tokens` : usageCost(usage), plural(usage.turns, 'turn')].join(' · ') : 'No turns'),
    span({ class: 'text-neutral-400' }, periodTitle(column.key, summary.bucket)),
  )
}

const bar = (column: Column, top: number, active: () => boolean) =>
  div({
    class: ['w-full transition-colors', () => (active() ? 'bg-accent-300' : 'bg-accent-400')],
    style: { height: cssPercent(column.value / top), minHeight: column.value > 0 ? '2px' : '0', maxWidth: '24px', borderRadius: '4px 4px 0 0' },
  })

const axisLabel = (text: string, style: Record<string, string>) =>
  span({ class: 'absolute text-xs text-neutral-500 tabular-nums whitespace-nowrap', style }, text)

export const chartView = (summary: UsageSummary, metric: Metric) => {
  const byKey = new Map(summary.periods.map(period => [period.key, period]))
  const columns: Column[] = periodKeys(summary.since, summary.until, summary.bucket).map(key => {
    const usage = byKey.get(key)
    return { key, usage, value: usage ? valueOf(usage, metric) : 0 }
  })
  const { top, ticks } = scaleFor(Math.max(0, ...columns.map(column => column.value)))
  const hovered = sig<number | undefined>(undefined)
  const count = columns.length
  const middle = Math.floor((count - 1) / 2)

  return div(
    { class: 'flex flex-col gap-2 pt-2' },
    div(
      { class: 'flex gap-2' },
      div(
        { class: 'relative h-40 shrink-0', style: { width: '48px' } },
        ticks.map(tick => axisLabel(tickText(tick, metric), { bottom: cssPercent(tick / top), right: '0', transform: 'translateY(50%)' })),
      ),
      div(
        { class: 'relative h-40 min-w-0 flex-1' },
        ticks.map(tick => div({ class: 'absolute right-0 left-0 h-px bg-neutral-700', style: { bottom: cssPercent(tick / top) } })),
        div(
          { class: 'absolute inset-0 flex items-end', style: { gap: '2px' }, onPointerLeave: () => hovered.set(undefined) },
          columns.map((column, index) =>
            div(
              {
                class: 'flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none',
                tabIndex: 0,
                'aria-label': `${periodTitle(column.key, summary.bucket)}: ${metricText(column.value, metric)}`,
                onPointerEnter: () => hovered.set(index),
                onFocus: () => hovered.set(index),
                onBlur: () => hovered.set(undefined),
              },
              bar(column, top, () => hovered.get() === index),
            ),
          ),
        ),
        dynamicChild(hovered, index => (index === undefined ? div() : tooltip(summary, columns[index]!, index, count, metric))),
      ),
    ),
    div(
      { class: 'flex gap-2' },
      div({ class: 'shrink-0', style: { width: '48px' } }),
      div(
        { class: 'relative h-4 min-w-0 flex-1' },
        axisLabel(periodLabel(columns[0]!.key, summary.bucket), { top: '0', left: '0' }),
        count > 2 ? axisLabel(periodLabel(columns[middle]!.key, summary.bucket), { top: '0', left: cssPercent((middle + 0.5) / count), transform: 'translateX(-50%)' }) : null,
        count > 1 ? axisLabel(periodLabel(columns[count - 1]!.key, summary.bucket), { top: '0', right: '0' }) : null,
      ),
    ),
  )
}
