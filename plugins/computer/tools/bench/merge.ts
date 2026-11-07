import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { reportHtml } from './report'
import type { Model, Outcome } from './run'

interface Run {
  title: string
  notes: string[]
  models: Model[]
  tasks: string[]
  budget: { spent: number }
  outcomes: Outcome[]
}

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' }, title: { type: 'string' } } })
if (!positionals.length || !values.out) throw new Error('Usage: bun merge.ts <results.json>... --out <folder> [--title <title>]; a later run replaces an earlier outcome of the same model and task')

const runs: Run[] = await Promise.all(positionals.map(file => Bun.file(file).json()))
const unique = (items: string[]) => [...new Set(items)]
const outcomes = [...new Map(runs.flatMap(run => run.outcomes.map(outcome => [`${outcome.model}\u0000${outcome.task}`, outcome] as const))).values()]
const spent = runs.reduce((sum, run) => sum + run.budget.spent, 0)
const models = unique(runs.flatMap(run => run.models.map(model => model.label)))
const tasks = unique(runs.flatMap(run => run.tasks))
const title = values.title ?? `Computer use bench: ${tasks.length} tasks, ${models.length} models, $${spent.toFixed(2)} spent`
const notes = unique(runs.flatMap(run => [run.title, ...run.notes]))

mkdirSync(values.out, { recursive: true })
await Bun.write(join(values.out, 'report.html'), reportHtml({ title, notes, models, tasks, outcomes }))
console.log(`report: ${join(values.out, 'report.html')}`)
