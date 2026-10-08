import type { UsageSummary, UsageTotals } from '@sand/protocol'
import { button, div, dynamicChild, segmented, settingsSection, span, tildeHome, type Child, type Sig } from '@sand/dom'
import { periodLabel, plural, tokens, tokensOf, usageCost } from '@sand/kit'
import { valueOf, type Metric } from '../format'
import { cssPercent } from './scale'

export type Breakdown = 'models' | 'periods' | 'threads'

interface Row {
  name: Child
  hint?: string
  meta?: string
  totals: UsageTotals
  open?: () => void
}

const cells = 'w-16 shrink-0 text-right tabular-nums sm:w-20'

const header = () =>
  div(
    { class: 'flex items-center gap-3 bg-neutral-900 px-4 py-2 text-xs text-neutral-500' },
    span({ class: 'min-w-0 flex-1' }),
    span({ class: cells }, 'API cost'),
    span({ class: cells }, 'Tokens'),
    span({ class: [cells, 'hidden sm:block'] }, 'Turns'),
  )

const rowView = (row: Row, share: number) =>
  (row.open ? button : div)(
    {
      class: ['flex w-full items-center gap-3 bg-neutral-900 px-4 py-2 text-left text-sm', row.open && 'cursor-pointer hover:bg-neutral-800'],
      title: row.hint,
      onClick: row.open,
    },
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-1' },
      span({ class: 'truncate text-neutral-100' }, row.name),
      div(
        { class: 'flex items-center gap-2' },
        div({ class: 'min-w-0 flex-1' }, div({ class: 'h-1 rounded-full bg-accent-400', style: { width: cssPercent(Math.max(share, 0.01)), opacity: '0.7' } })),
        row.meta ? span({ class: 'shrink-0 text-xs text-neutral-500' }, row.meta) : null,
      ),
    ),
    span({ class: [cells, 'text-neutral-100'] }, usageCost(row.totals)),
    span({ class: [cells, 'text-neutral-300'] }, tokens(tokensOf(row.totals.usage))),
    span({ class: [cells, 'hidden text-neutral-400 sm:block'] }, String(row.totals.turns)),
  )

const table = (rows: Row[], metric: Metric, sorted: boolean) => {
  const shown = sorted ? rows.toSorted((a, b) => valueOf(b.totals, metric) - valueOf(a.totals, metric)) : rows
  const peak = Math.max(...rows.map(row => valueOf(row.totals, metric)), 0) || 1
  return div({ class: 'contents' }, header(), shown.map(row => rowView(row, valueOf(row.totals, metric) / peak)))
}

export const breakdownView = (summary: UsageSummary, metric: Metric, view: Sig<Breakdown>, openThread?: (id: string) => void) => {
  const labels: Record<Breakdown, string> = { models: 'Models', periods: summary.bucket === 'hour' ? 'Hours' : 'Days', threads: 'Threads' }
  const models: Row[] = summary.models.map(model => ({ name: model.label, hint: model.model, totals: model }))
  const periods: Row[] = summary.periods.toReversed().map(period => ({ name: periodLabel(period.key, summary.bucket), totals: period }))
  const threads: Row[] = summary.threads.map(thread => ({
    name: thread.title ?? 'Untitled',
    hint: [thread.title, thread.cwd && tildeHome(thread.cwd)].filter(Boolean).join('\n'),
    meta: thread.agents ? `+${plural(thread.agents, 'agent')}` : undefined,
    totals: thread,
    open: openThread && (() => openThread(thread.id)),
  }))
  const choices = (['models', 'periods', 'threads'] as const).map(value => ({ value, label: labels[value] }))
  return div(
    { class: 'flex flex-col gap-2' },
    div({ class: 'flex' }, segmented(choices, view, value => view.set(value))),
    settingsSection(
      {},
      dynamicChild(view, current => {
        const rows = { models, periods, threads }[current]
        return table(rows, metric, current !== 'periods')
      }),
    ),
  )
}
