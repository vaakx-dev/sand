import type { Item } from '../parts/contract'
import { currentKind, kindsIn } from './kinds'

export interface TurnHead {
  kind: 'turn'
  key: string
  running: boolean
  start: number | undefined
  end: number
  kinds: string[]
  current: string | undefined
}

export interface ShownItem {
  kind: 'item'
  key: string
  item: Item
  rail: boolean
}

export interface TurnFoot {
  kind: 'foot'
  key: string
  entry: string
  running: boolean
}

export type Shown = ShownItem | TurnHead | TurnFoot

export interface FoldOptions {
  older: boolean
  running: boolean
  streaming: boolean
  started: number | undefined
  footers: boolean
  open(key: string): boolean
}

interface Turn {
  head?: Item
  body: Item[]
}

const opens = (item: Item) => item.opens !== undefined

const timeOf = (item: Item) => {
  if (item.kind === 'tools') return item.end
  if (item.kind === 'custom') return item.entry.at
  return 'at' in item ? item.at : undefined
}

const split = (items: Item[]) => {
  let current: Turn = { body: [] }
  const turns = [current]
  for (const item of items) {
    if (opens(item)) {
      current = { head: item, body: [] }
      turns.push(current)
    } else if (item.kind !== 'live') current.body.push(item)
  }
  return turns.filter(turn => turn.head || turn.body.length)
}

const pinned = (item: Item) => item.kind === 'custom' || item.kind === 'user'

const trailing = (item: Item) => item.kind === 'notice' || pinned(item)

const tail = (body: Item[]) => body.findLastIndex(item => !trailing(item)) + 1

const answered = (body: Item[]) => body[tail(body) - 1]?.kind === 'text'

const visibleFrom = (body: Item[]) => {
  const from = tail(body)
  return answered(body) ? from - 1 : from
}

const headOf = (turn: Turn, work: Item[], running: boolean, started: number | undefined): TurnHead => {
  const items = turn.head ? [turn.head, ...turn.body] : turn.body
  const times = items.flatMap(item => timeOf(item) ?? [])
  const first = turn.head ? timeOf(turn.head) : times[0]
  return {
    kind: 'turn',
    key: `turn:${items[0]!.key}`,
    running,
    start: running ? (started ?? first) : first,
    end: Math.max(0, ...times),
    kinds: kindsIn(work),
    current: currentKind(work),
  }
}

const shownTurn = (turn: Turn, running: boolean, options: FoldOptions): Shown[] => {
  const from = visibleFrom(turn.body)
  const isWork = (item: Item, index: number) => index < from && !pinned(item)
  const work = turn.body.filter(isWork)
  const cut = !turn.head && options.older
  const head = !cut && (running || work.length) ? headOf(turn, work, running, options.started) : undefined
  const expanded = head !== undefined && options.open(head.key)
  const shown: Shown[] = []
  if (turn.head) shown.push({ kind: 'item', key: turn.head.key, item: turn.head, rail: false })
  if (head) shown.push(head)
  turn.body.forEach((item, index) => {
    const rail = isWork(item, index)
    if (!rail || expanded) shown.push({ kind: 'item', key: item.key, item, rail })
  })
  return shown
}

const footOf = (turn: Turn, running: boolean, options: FoldOptions): TurnFoot[] =>
  options.footers && turn.head?.opens ? [{ kind: 'foot', key: `foot:${turn.head.opens}`, entry: turn.head.opens, running }] : []

const isRunning = (turn: Turn, last: boolean, options: FoldOptions) => last && options.running && (options.streaming || !answered(turn.body))

export const foldTurns = (items: Item[], options: FoldOptions): Shown[] => {
  const turns = split(items)
  return turns.flatMap((turn, index) => {
    const last = index === turns.length - 1
    return [...shownTurn(turn, isRunning(turn, last, options), options), ...footOf(turn, last && options.running, options)]
  })
}
