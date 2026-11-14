import { parseArgs } from 'node:util'
import type { Measured, Results, Rule, Unit } from './row'

interface Verdict {
  main?: number
  pr?: number
  failed: boolean
}

const MARKER = '<!-- sand-bench -->'

const LIMITS: Record<Rule, number> = { timing: 0.15, exact: 0.05 }

const SLACK: Record<Unit, number> = { ms: 20, bytes: 1024 }

const KB = 1024

const median = (numbers: number[]) => {
  if (!numbers.length) return undefined
  const sorted = numbers.toSorted((first, second) => first - second)
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1]! + sorted[middle]!) / 2
}

const verdict = ({ rule, unit, samples }: Measured): Verdict => {
  const main = median(samples.main)
  const pr = median(samples.pr)
  if (pr === undefined) return { main, failed: true }
  if (main === undefined) return { pr, failed: false }
  return { main, pr, failed: pr > main * (1 + LIMITS[rule]) + SLACK[unit] }
}

const shown = (value: number | undefined, unit: Unit) => {
  if (value === undefined) return 'not measured'
  if (unit === 'ms') return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`
  if (value < KB) return `${Math.round(value)} B`
  if (value < KB * KB) return `${(value / KB).toFixed(1)} KB`
  return `${(value / KB / KB).toFixed(1)} MB`
}

const change = ({ main, pr }: Verdict) => {
  if (main === undefined || pr === undefined) return ''
  if (main === pr) return '0%'
  if (main === 0) return 'new'
  const percent = ((pr - main) / main) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

const line = (row: Measured) => {
  const found = verdict(row)
  return { failed: found.failed, text: `| ${row.name} | ${shown(found.main, row.unit)} | ${shown(found.pr, row.unit)} | ${change(found)} | ${found.failed ? '❌' : '✅'} |` }
}

const section = (results: Results) => {
  const lines = results.rows.map(line)
  const broken = results.failure ? [`| ⚠️ the run stopped: ${results.failure.split('\n')[0]} | | | | ❌ |`] : []
  return {
    failures: lines.filter(found => found.failed).length + broken.length,
    text: [`| **${results.group}** | | | | |`, ...broken, ...lines.map(found => found.text)].join('\n'),
  }
}

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' }, pr: { type: 'string' }, rounds: { type: 'string', default: '5' }, run: { type: 'string' } } })

const load = (file: string): Promise<Results> => Bun.file(file).json().catch(() => ({ group: file, rows: [], failure: 'the job wrote no results; see its log' }))

const loaded = await Promise.all(positionals.map(load))
const mainCommit = loaded.find(results => results.mainCommit)?.mainCommit
const sections = loaded.map(section)
const failures = sections.reduce((sum, found) => sum + found.failures, 0)
const heading = failures ? `❌ ${failures} ${failures === 1 ? 'row got' : 'rows got'} worse or couldn't be measured` : '✅ every row is within its limit'
const comment = [
  MARKER,
  `### Performance: ${heading}`,
  '',
  `Main \`${mainCommit?.slice(0, 7)}\` against this PR \`${values.pr?.slice(0, 7)}\`, both measured in the same job, medians of ${values.rounds} runs. Times, memory and CPU fail when the PR is more than ${LIMITS.timing * 100}% worse, bytes when they grow more than ${LIMITS.exact * 100}%; changes under ${SLACK.ms} ms or ${SLACK.bytes / KB} KB never fail.${values.run ? ` [Logs](${values.run})` : ''}`,
  '',
  '| | main | PR | change | |',
  '| --- | ---: | ---: | ---: | :---: |',
  ...sections.map(found => found.text),
  '',
].join('\n')

if (values.out) await Bun.write(values.out, comment)
console.log(comment)
if (failures) process.exitCode = 1
