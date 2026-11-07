import { bars, escape, mean, page, percentile, seconds, table } from '@sand/report'
import type { Outcome } from './run'

export interface Report {
  title: string
  notes: string[]
  models: string[]
  tasks: string[]
  outcomes: Outcome[]
}

const dollars = (value: number | undefined) => (value === undefined ? '—' : `$${value.toFixed(value < 0.1 ? 4 : 2)}`)

const costs = (outcomes: Outcome[]) => {
  const priced = outcomes.flatMap(outcome => (outcome.costUsd === undefined ? [] : [outcome.costUsd]))
  return priced.length === outcomes.length ? priced : undefined
}

const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0)

const metrics: Record<string, (outcomes: Outcome[]) => string> = {
  Passed: outcomes => `${outcomes.filter(outcome => outcome.pass).length} / ${outcomes.length}`,
  'Median time': outcomes => seconds(percentile(outcomes.map(outcome => outcome.ms).sort((a, b) => a - b), 0.5)),
  'Steps per task': outcomes => mean(outcomes.map(outcome => outcome.steps)).toFixed(1),
  'Tokens per task, in / out': outcomes => `${Math.round(mean(outcomes.map(outcome => outcome.inputTokens))).toLocaleString('en-US')} / ${Math.round(mean(outcomes.map(outcome => outcome.outputTokens))).toLocaleString('en-US')}`,
  'Cost per task': outcomes => {
    const spent = costs(outcomes)
    return spent ? dollars(mean(spent)) : '�'
  },
  'Cost per pass': outcomes => {
    const passes = outcomes.filter(outcome => outcome.pass).length
    const spent = costs(outcomes)
    return passes && spent ? dollars(total(spent) / passes) : '—'
  },
}

const cell = (outcome: Outcome) =>
  `<span title="${escape(outcome.why).replaceAll('"', '&quot;')}">${outcome.pass ? '✓' : '✗'} ${seconds(outcome.ms)}<small> ${outcome.steps} steps</small></span>`

export const reportHtml = ({ title, notes, models, tasks, outcomes }: Report) => {
  const byModel = Map.groupBy(outcomes, outcome => outcome.model)
  const find = (model: string, task: string) => outcomes.find(outcome => outcome.model === model && outcome.task === task)
  const places = [...new Set(outcomes.map(outcome => outcome.place))]
  const rate = (part: Outcome[]) => part.filter(outcome => outcome.pass).length / part.length
  const ranked = models
    .filter(model => byModel.has(model))
    .map(model => ({ label: model, value: rate(byModel.get(model)!), text: metrics.Passed!(byModel.get(model)!) }))
    .sort((a, b) => b.value - a.value)
  const failures = outcomes.filter(outcome => !outcome.pass)
  return page(title, notes, [
    { title: 'Tasks passed', html: bars(ranked, 1) },
    { title: 'Models', html: table(models, Object.keys(metrics), (model, metric) => byModel.has(model) ? { html: metrics[metric]!(byModel.get(model)!) } : undefined) },
    {
      title: 'Each task (hover a cell for why)',
      html: table(tasks, models, (task, model) => {
        const outcome = find(model, task)
        return outcome && { html: cell(outcome), shade: outcome.pass ? 1 : 0 }
      }),
    },
    {
      title: 'Pass rate by kind of task',
      html: table(places, models, (place, model) => {
        const part = outcomes.filter(outcome => outcome.model === model && outcome.place === place)
        return part.length ? { html: `${Math.round(rate(part) * 100)}%<small> ${part.length}</small>`, shade: rate(part) } : undefined
      }),
    },
    {
      title: 'Failures',
      html: failures.length
        ? `<ul>${failures.map(outcome => `<li><b>${escape(outcome.model)}</b> · ${escape(outcome.task)}: ${escape(outcome.why)}</li>`).join('')}</ul>`
        : '<p>None.</p>',
    },
  ])
}
