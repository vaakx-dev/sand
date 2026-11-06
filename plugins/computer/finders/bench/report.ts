import { buckets, summarize, type Outcome, type Summary } from './score'

export interface Report {
  title: string
  notes: string[]
  outcomes: Outcome[]
  strategies: string[]
}

type Key = (outcome: Outcome) => string

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

const percent = (value: number) => `${Math.round(value * 100)}%`

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

const heat = (value: number) => `hsl(${Math.round(value * 120)} 55% 32%)`

const modelOf: Key = outcome => `${outcome.model} ${outcome.effort}`

const unique = (values: string[]) => [...new Set(values)]

const matrix = (outcomes: Outcome[], rowOf: Key, columnOf: Key, columns: string[], cell: (summary: Summary) => string, shade?: (summary: Summary) => number) => {
  const rows = unique(outcomes.map(rowOf))
  if (!rows.length) return '<p>No targets.</p>'
  const found = new Map(summarize(outcomes, outcome => `${rowOf(outcome)}\u0000${columnOf(outcome)}`).map(summary => [summary.key, summary]))
  const used = columns.filter(column => rows.some(row => found.has(`${row}\u0000${column}`)))
  const body = rows.map(row => {
    const cells = used.map(column => {
      const summary = found.get(`${row}\u0000${column}`)
      if (!summary) return '<td>–</td>'
      return `<td${shade ? ` style="background:${heat(shade(summary))}"` : ''}>${cell(summary)}</td>`
    })
    return `<tr><th>${escape(row)}</th>${cells.join('')}</tr>`
  })
  return `<div class="wide"><table><tr><th></th>${used.map(column => `<th>${escape(column)}</th>`).join('')}</tr>${body.join('')}</table></div>`
}

const bars = (summaries: Summary[], value: (summary: Summary) => number, text: (summary: Summary) => string, max = Math.max(...summaries.map(value))) =>
  `<div class="bars">${summaries
    .map(
      summary =>
        `<div class="bar"><span>${escape(summary.key)}</span><span class="track"><i style="width:${max > 0 ? (value(summary) / max) * 100 : 0}%;background:${heat(value(summary) / (max || 1))}"></i></span><b>${text(summary)}</b></div>`,
    )
    .join('')}</div>`

const hitCell = (summary: Summary) => `${percent(summary.hitRate)}<small> ${summary.count}</small>`

export const reportHtml = ({ title, notes, outcomes, strategies }: Report) => {
  const bySource = (source: string) => outcomes.filter(outcome => outcome.source === source)
  const ranked = (key: Key) => summarize(outcomes, key).sort((a, b) => b.hitRate - a.hitRate)
  const hits = (part: Outcome[]) => matrix(part, modelOf, outcome => outcome.strategy, strategies, hitCell, summary => summary.hitRate)
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><style>
body { font: 14px/1.4 system-ui, sans-serif; margin: 0 auto; padding: 16px; max-width: 980px; background: #111418; color: #e6e9ef; }
h1 { font-size: 20px; } h2 { font-size: 16px; margin: 28px 0 8px; } li { margin: 3px 0; } small { opacity: 0.65; font-size: 10px; }
.wide { overflow-x: auto; } table { border-collapse: collapse; font-size: 12px; } td, th { padding: 3px 6px; border: 1px solid #2b313b; text-align: right; white-space: nowrap; } th:first-child { text-align: left; }
.bars { display: grid; gap: 4px; } .bar { display: grid; grid-template-columns: minmax(0, 13rem) minmax(0, 1fr) 5rem; gap: 8px; align-items: center; font-size: 12px; }
.bar span:first-child { overflow-wrap: anywhere; } .track { height: 14px; background: #1c2129; border-radius: 3px; } .track i { display: block; height: 100%; border-radius: 3px; } .bar b { font-weight: 500; text-align: right; }
</style></head><body><h1>${escape(title)}</h1><ul>${notes.map(note => `<li>${escape(note)}</li>`).join('')}</ul>
<h2>Hit rate by strategy</h2>${bars(ranked(outcome => outcome.strategy), summary => summary.hitRate, summary => percent(summary.hitRate), 1)}
<h2>Hit rate by model and reasoning</h2>${bars(ranked(modelOf), summary => summary.hitRate, summary => percent(summary.hitRate), 1)}
<h2>Hit rate, all targets (model × strategy)</h2>${hits(outcomes)}
<h2>Hit rate, synthetic pages</h2>${hits(bySource('synthetic'))}
<h2>Hit rate, ScreenSpot-v2 (no element list, so vision strategies only)</h2>${hits(bySource('screenspot'))}
<h2>Hit rate by target size (strategy × size)</h2>${matrix(outcomes, outcome => outcome.strategy, outcome => outcome.bucket, [...buckets], hitCell, summary => summary.hitRate)}
<h2>Hit rate by target kind (kind × strategy)</h2>${matrix(outcomes, outcome => outcome.kind, outcome => outcome.strategy, strategies, hitCell, summary => summary.hitRate)}
<h2>Latency per locate, p50 / p95</h2>${matrix(outcomes, modelOf, outcome => outcome.strategy, strategies, summary => `${seconds(summary.p50ms)} / ${seconds(summary.p95ms)}`)}
<h2>Cost per 1,000 locates</h2>${matrix(outcomes, modelOf, outcome => outcome.strategy, strategies, summary => `$${summary.costPer1000.toFixed(2)}`)}
<h2>Tokens per locate, in / out</h2>${matrix(outcomes, modelOf, outcome => outcome.strategy, strategies, summary => `${Math.round(summary.inputTokens)} / ${Math.round(summary.outputTokens)}`)}
<h2>Errors</h2>${matrix(outcomes, modelOf, outcome => outcome.strategy, strategies, summary => String(summary.errors))}
</body></html>`
}
