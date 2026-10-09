import type { UsageSummary, UsageTotals } from '@sand/protocol'
import { button, div, dynamicChild, focusable, providerColor, providerIcon, section, segmented, span, table, tbody, td, th, thead, tildeHome, tr, type Child, type Sig } from '@sand/dom'
import { periodTitle, plural, tokens, tokensOf } from '@sand/kit'
import { costText, shareText, valueOf, type Metric } from '../../format'
import { heading } from '../parts'
import { cssPercent } from './chart/scale'

export type Breakdown = 'models' | 'threads' | 'periods'

interface Row {
  key: string
  name: Child
  hint?: string
  meta?: string
  mark?: Child
  color: string
  totals: UsageTotals
  open?: () => void
}

const numberCell = 'py-3 pl-6 text-right whitespace-nowrap tabular-nums'

const head = (name: string) =>
  thead(
    tr(
      { class: 'border-b border-neutral-800 text-xs text-neutral-500' },
      th({ class: 'py-2 pr-3 text-left font-normal' }, '#'),
      th({ class: 'w-full py-2 text-left font-normal' }, name),
      th({ class: 'py-2 pl-6 text-right font-normal' }, 'Cost'),
      th({ class: 'py-2 pl-6 text-right font-normal' }, 'Share'),
      th({ class: 'py-2 pl-6 text-right font-normal' }, 'Tokens'),
    ),
  )

const nameCell = (row: Row, fraction: number) =>
  td(
    { class: 'w-full py-3 text-left', style: { maxWidth: '0' } },
    div(
      { class: 'flex min-w-0 items-center gap-2 text-neutral-100', title: row.hint },
      row.mark ?? null,
      row.open
        ? button({ type: 'button', class: ['truncate rounded-sm text-left hover:underline', focusable] }, row.name)
        : span({ class: 'truncate' }, row.name),
      row.meta ? span({ class: 'shrink-0 text-xs text-neutral-500' }, row.meta) : null,
    ),
    div({ class: 'mt-2 max-w-48' }, div({ class: 'rounded-full', style: { height: '2px', width: cssPercent(Math.max(fraction, 0.02)), background: row.color } })),
  )

const rowView = (row: Row, index: number, metric: Metric, peak: number, total: number) =>
  tr(
    {
      class: ['border-b border-neutral-800 text-sm text-neutral-400 transition-colors', row.open && 'cursor-pointer hover:bg-neutral-800'],
      onClick: row.open,
    },
    td({ class: 'py-3 pr-3 text-left text-xs tabular-nums' }, String(index + 1)),
    nameCell(row, peak ? valueOf(row.totals, metric) / peak : 0),
    td({ class: [numberCell, 'text-neutral-100'] }, costText(row.totals)),
    td({ class: numberCell }, shareText(valueOf(row.totals, metric), total)),
    td({ class: numberCell }, tokens(tokensOf(row.totals.usage))),
  )

const rowsOf = (summary: UsageSummary, view: Breakdown, openThread?: (id: string) => void): Row[] => {
  const order = new Map(summary.providers.map((provider, index) => [provider.id, index]))
  const lead = summary.providers[0]?.id ?? ''
  if (view === 'models')
    return summary.models.map(model => ({
      key: `${model.provider}:${model.model}`,
      name: model.label,
      hint: model.model,
      mark: providerIcon(model.provider, 14),
      color: providerColor(model.provider, order.get(model.provider)),
      totals: model,
    }))
  if (view === 'threads')
    return summary.threads.map(thread => ({
      key: thread.id,
      name: thread.title ?? 'Untitled',
      hint: [thread.title, thread.cwd && tildeHome(thread.cwd)].filter(Boolean).join('\n'),
      meta: thread.agents ? `+${plural(thread.agents, 'agent')}` : undefined,
      color: providerColor(lead),
      totals: thread,
      open: openThread && (() => openThread(thread.id)),
    }))
  return summary.periods.toReversed().map(period => ({ key: period.key, name: periodTitle(period.key, summary.bucket), color: providerColor(lead), totals: period }))
}

const tableView = (summary: UsageSummary, view: Breakdown, metric: Metric, openThread?: (id: string) => void) => {
  const rows = rowsOf(summary, view, openThread)
  const sorted = view === 'periods' ? rows : rows.toSorted((a, b) => valueOf(b.totals, metric) - valueOf(a.totals, metric))
  const peak = Math.max(0, ...rows.map(row => valueOf(row.totals, metric)))
  const total = valueOf(summary.total, metric)
  const name = view === 'models' ? 'Model' : view === 'threads' ? 'Thread' : summary.bucket === 'hour' ? 'Hour' : 'Day'
  return div(
    { class: 'min-w-0 overflow-auto' },
    table({ class: 'w-full', style: { borderCollapse: 'collapse' } }, head(name), tbody(sorted.map((row, index) => rowView(row, index, metric, peak, total)))),
  )
}

export const breakdownView = (summary: UsageSummary, metric: Metric, view: Sig<Breakdown>, openThread?: (id: string) => void) => {
  const choices: { value: Breakdown; label: string }[] = [
    { value: 'models', label: 'Model' },
    { value: 'threads', label: 'Thread' },
    { value: 'periods', label: summary.bucket === 'hour' ? 'Hour' : 'Day' },
  ]
  return section(
    { class: 'flex flex-col gap-3' },
    div({ class: 'flex items-center justify-between gap-3' }, heading('Breakdown'), segmented(choices, view, value => view.set(value), { label: 'Breakdown' })),
    dynamicChild(view, current => tableView(summary, current, metric, openThread)),
  )
}
