import type { UsageSummary, UsageTotals } from '@sand/usage/contract'
import { periodLabel, plural, tokens, tokensOf, usageCost, windowText } from '@sand/kit'
import { rangeTitle, type Range } from './range'

const table = (head: string[], rows: string[][]) => {
  const all = [head, ...rows]
  const widths = head.map((_, column) => Math.max(...all.map(row => row[column]!.length)))
  return all.map(row => row.map((cell, column) => (column ? cell.padStart(widths[column]!) : cell.padEnd(widths[column]!))).join('  ').trimEnd())
}

const numbers = (totals: UsageTotals) => [usageCost(totals), tokens(tokensOf(totals.usage)), String(totals.turns)]

const breakdown = (label: string, rows: [string, UsageTotals][]) =>
  rows.length ? ['', ...table([label, 'API cost', 'Tokens', 'Turns'], rows.map(([name, totals]) => [name, ...numbers(totals)]))] : []

const pairs = (rows: [string, string][]) => {
  const width = Math.max(...rows.map(([label]) => label.length))
  return rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`)
}

const clip = (text: string, width = 48) => (text.length > width ? `${text.slice(0, width - 1)}…` : text)

const threadName = (thread: UsageSummary['threads'][number]) =>
  `${clip(thread.title ?? 'Untitled')}${thread.agents ? ` (+${plural(thread.agents, 'agent')})` : ''}`

export const printSummary = (summary: UsageSummary, range: Range) => {
  const { total, limits } = summary
  const { input, cacheRead, cacheWrite, output } = total.usage
  const windows = limits?.windows ?? []
  return [
    rangeTitle[range],
    ...pairs([
      ['API cost', usageCost(total)],
      ['Tokens', `${tokens(tokensOf(total.usage))} · ${tokens(input)} input · ${tokens(cacheRead)} cache read · ${tokens(cacheWrite)} cache write · ${tokens(output)} output`],
      ['Turns', `${total.turns} · ${plural(total.threads, 'thread')}`],
    ]),
    '',
    ...(windows.length ? pairs(windows.map(window => [window.label, windowText(window)])) : ['Limits  not reported']),
    ...breakdown('Model', summary.models.map(model => [model.label, model])),
    ...breakdown(summary.bucket === 'hour' ? 'Hour' : 'Day', summary.periods.map(row => [periodLabel(row.key, summary.bucket), row])),
    ...breakdown('Thread', summary.threads.map(thread => [threadName(thread), thread])),
  ].join('\n')
}
