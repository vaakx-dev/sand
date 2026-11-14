import type { Cost } from '../measure'
import type { Sand } from '../sandbox'

export type Unit = 'ms' | 'bytes'

export type Rule = 'timing' | 'exact'

export type TreeName = 'main' | 'pr'

export interface Tree {
  name: TreeName
  sand: Sand
}

export interface Row {
  name: string
  unit: Unit
  rule: Rule
  read(run: Run): number | undefined
}

export interface Suite {
  group: string
  rows: Row[]
  measure(trees: Tree[], runs: Runs, rounds: number): Promise<void>
}

export interface Measured {
  name: string
  unit: Unit
  rule: Rule
  samples: Record<TreeName, number[]>
}

export interface Results {
  group: string
  mainCommit?: string
  rows: Measured[]
  failure?: string
}

class Run {
  readonly costs = new Map<string, Cost>()
  readonly marks = new Map<string, number>()
}

class Runs {
  readonly #byTree = new Map<TreeName, Run[]>()

  add(tree: Tree) {
    const run = new Run()
    this.#byTree.set(tree.name, [...(this.#byTree.get(tree.name) ?? []), run])
    return run
  }

  samples(row: Row, tree: TreeName) {
    return (this.#byTree.get(tree) ?? []).map(run => row.read(run)).filter(value => value !== undefined)
  }
}

function wire(cost: Cost): number
function wire(cost: Cost | undefined): number | undefined
function wire(cost: Cost | undefined) {
  return cost && cost.wireDown + cost.wireUp
}

const ordered = <T>(items: T[], round: number) => (round % 2 ? items.toReversed() : items)

const repeated = <T>(items: T[], rounds: number) => Array.from({ length: rounds }, () => items)

const interleave = async <T>(rounds: T[][], act: (item: T) => Promise<void>) => {
  for (const [round, items] of rounds.entries()) for (const item of ordered(items, round)) await act(item)
}

export { interleave, ordered, repeated, Run, Runs, wire }
