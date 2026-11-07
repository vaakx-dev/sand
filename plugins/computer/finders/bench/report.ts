import { bars, percent, page, seconds, table, type Cell } from '@sand/report'
import { buckets, summarize, type Outcome, type Summary } from './score'

export interface Report {
  title: string
  notes: string[]
  outcomes: Outcome[]
  strategies: string[]
}

type Key = (outcome: Outcome) => string

const modelOf: Key = outcome => `${outcome.model} ${outcome.effort}`

const unique = (values: string[]) => [...new Set(values)]

const matrix = (outcomes: Outcome[], rowOf: Key, columnOf: Key, columns: string[], cell: (summary: Summary) => string, shade?: (summary: Summary) => number) => {
  const found = new Map(summarize(outcomes, outcome => `${rowOf(outcome)}\u0000${columnOf(outcome)}`).map(summary => [summary.key, summary]))
  return table(unique(outcomes.map(rowOf)), columns, (row, column): Cell | undefined => {
    const summary = found.get(`${row}\u0000${column}`)
    return summary && { html: cell(summary), shade: shade?.(summary) }
  })
}

const hitCell = (summary: Summary) => `${percent(summary.hitRate)}<small> ${summary.count}</small>`

export const reportHtml = ({ title, notes, outcomes, strategies }: Report) => {
  const bySource = (source: string) => outcomes.filter(outcome => outcome.source === source)
  const ranked = (key: Key) =>
    bars(
      summarize(outcomes, key)
        .sort((a, b) => b.hitRate - a.hitRate)
        .map(summary => ({ label: summary.key, value: summary.hitRate, text: percent(summary.hitRate) })),
      1,
    )
  const hits = (part: Outcome[]) => matrix(part, modelOf, outcome => outcome.strategy, strategies, hitCell, summary => summary.hitRate)
  const byModel = (cell: (summary: Summary) => string) => matrix(outcomes, modelOf, outcome => outcome.strategy, strategies, cell)
  return page(title, notes, [
    { title: 'Hit rate by strategy', html: ranked(outcome => outcome.strategy) },
    { title: 'Hit rate by model and reasoning', html: ranked(modelOf) },
    { title: 'Hit rate, all targets (model × strategy)', html: hits(outcomes) },
    { title: 'Hit rate, synthetic pages', html: hits(bySource('synthetic')) },
    { title: 'Hit rate, ScreenSpot-v2 (no element list, so vision strategies only)', html: hits(bySource('screenspot')) },
    { title: 'Hit rate by target size (strategy × size)', html: matrix(outcomes, outcome => outcome.strategy, outcome => outcome.bucket, [...buckets], hitCell, summary => summary.hitRate) },
    { title: 'Hit rate by target kind (kind × strategy)', html: matrix(outcomes, outcome => outcome.kind, outcome => outcome.strategy, strategies, hitCell, summary => summary.hitRate) },
    { title: 'Latency per locate, p50 / p95', html: byModel(summary => `${seconds(summary.p50ms)} / ${seconds(summary.p95ms)}`) },
    { title: 'Cost per 1,000 locates', html: byModel(summary => `$${summary.costPer1000.toFixed(2)}`) },
    { title: 'Tokens per locate, in / out', html: byModel(summary => `${Math.round(summary.inputTokens)} / ${Math.round(summary.outputTokens)}`) },
    { title: 'Errors', html: byModel(summary => String(summary.errors)) },
  ])
}
