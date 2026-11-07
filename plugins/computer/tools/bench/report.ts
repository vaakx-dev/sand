import { bars, escape, mean, page, percentile, seconds, table } from '@sand/report'
import { causes } from './judge'
import type { Outcome } from './run'
import { kinds } from './tasks'

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
    return spent ? dollars(mean(spent)) : '—'
  },
  'Total cost': outcomes => {
    const spent = costs(outcomes)
    return spent ? dollars(total(spent)) : '—'
  },
  'Cost per pass': outcomes => {
    const passes = outcomes.filter(outcome => outcome.pass).length
    const spent = costs(outcomes)
    return passes && spent ? dollars(total(spent) / passes) : '—'
  },
}

const kindOf = (label: string) => Object.entries(kinds).find(([, each]) => each === label)?.[0]

const causeOf = (label: string) => Object.entries(causes).find(([, each]) => each === label)?.[0]

const failureLine = (outcome: Outcome) =>
  `<li><b>${escape(outcome.model)}</b> · ${escape(outcome.task)} · <i>${outcome.cause ? causes[outcome.cause] : 'no diagnosis'}</i>: ${escape(outcome.evidence ?? '')} <small>check: ${escape(outcome.why)}</small></li>`

const cell = (outcome: Outcome) =>
  `<span title="${escape(outcome.why).replaceAll('"', '&quot;')}">${outcome.pass ? '✓' : '✗'} ${seconds(outcome.ms)}<small> ${outcome.steps} steps</small></span>`

export const reportHtml = ({ title, notes, models, tasks, outcomes }: Report) => {
  const byModel = Map.groupBy(outcomes, outcome => outcome.model)
  const find = (model: string, task: string) => outcomes.find(outcome => outcome.model === model && outcome.task === task)
  const places = [...new Set(outcomes.map(outcome => outcome.place))]
  const kindLabels = Object.entries(kinds).flatMap(([kind, label]) => (outcomes.some(outcome => outcome.kind === kind) ? [label] : []))
  const causeLabels = Object.entries(causes).flatMap(([cause, label]) => (outcomes.some(outcome => outcome.cause === cause) ? [label] : []))
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
      title: 'Pass rate by kind of task',
      html: table(kindLabels, models, (label, model) => {
        const part = outcomes.filter(outcome => outcome.model === model && outcome.kind === kindOf(label))
        return part.length ? { html: `${Math.round(rate(part) * 100)}%<small> ${part.length}</small>`, shade: rate(part) } : undefined
      }),
    },
    {
      title: 'Why tasks failed',
      html: table(causeLabels, models, (label, model) => {
        const count = failures.filter(outcome => outcome.model === model && outcome.cause === causeOf(label)).length
        return { html: String(count), shade: count ? 0 : 1 }
      }),
    },
    {
      title: 'Each task (hover a cell for why)',
      html: table(tasks, models, (task, model) => {
        const outcome = find(model, task)
        return outcome && { html: cell(outcome), shade: outcome.pass ? 1 : 0 }
      }),
    },
    {
      title: 'Pass rate by place',
      html: table(places, models, (place, model) => {
        const part = outcomes.filter(outcome => outcome.model === model && outcome.place === place)
        return part.length ? { html: `${Math.round(rate(part) * 100)}%<small> ${part.length}</small>`, shade: rate(part) } : undefined
      }),
    },
    {
      title: 'Failures',
      html: failures.length
        ? `<ul>${failures.map(failureLine).join('')}</ul>`
        : '<p>None.</p>',
    },
  ])
}
