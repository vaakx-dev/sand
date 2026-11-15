import { parseArgs } from 'node:util'
import { Sand } from '../sandbox'
import { pages } from './pages'
import { pc } from './pc'
import { phone } from './phone'
import { type Results, Runs, type Suite, type Tree } from './row'

const SUITES: Record<string, Suite> = { phone, pages, pc }

const { values } = parseArgs({
  options: {
    suite: { type: 'string' },
    main: { type: 'string' },
    pr: { type: 'string' },
    rounds: { type: 'string', default: '5' },
    out: { type: 'string' },
  },
})

const suite = SUITES[values.suite ?? '']
if (!suite || !values.main || !values.out) {
  console.error(`usage: bun run bench:gate --suite ${Object.keys(SUITES).join('|')} --main <main checkout> [--pr <PR checkout>] [--rounds 5] --out <results.json>`)
  process.exit(2)
}

const commitOf = (root: string) => Bun.spawnSync(['git', '-C', root, 'rev-parse', 'HEAD']).stdout.toString().trim()

const trees: Tree[] = [
  { name: 'main', sand: new Sand(values.main) },
  { name: 'pr', sand: new Sand(values.pr) },
]
const runs = new Runs()
const failure = await suite.measure(trees, runs, Number(values.rounds)).then(
  () => undefined,
  (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : String(error)),
)

const results: Results = {
  group: suite.group,
  mainCommit: commitOf(values.main),
  rows: suite.rows.map(row => ({ name: row.name, unit: row.unit, rule: row.rule, samples: { main: runs.samples(row, 'main'), pr: runs.samples(row, 'pr') } })),
  failure,
}

await Bun.write(values.out, JSON.stringify(results, null, 2))
console.table(results.rows.map(({ name, samples }) => ({ name, main: samples.main.map(Math.round).join(' '), pr: samples.pr.map(Math.round).join(' ') })))
if (failure) {
  console.error(failure)
  process.exitCode = 1
}
