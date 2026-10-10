import type { Item } from '@sand/transcript-parts/contract'

export interface TurnHead {
  kind: 'turn'
  key: string
  running: boolean
  start: number | undefined
  end: number
  calls: number
}

export interface ShownItem {
  kind: 'item'
  key: string
  item: Item
  rail: boolean
}

export type Shown = ShownItem | TurnHead

export interface FoldOptions {
  running: boolean
  streaming: boolean
  started: number | undefined
  open(key: string): boolean
}

interface Turn {
  head?: Item
  body: Item[]
}

const opens = (item: Item) => (item.kind === 'user' || item.kind === 'notification') && !item.steer

const timeOf = (item: Item) => {
  if (item.kind === 'tools') return item.end
  if (item.kind === 'custom') return item.entry.at
  return 'at' in item ? item.at : undefined
}

const split = (items: Item[]) => {
  const turns: Turn[] = [{ body: [] }]
  for (const item of items) {
    if (opens(item)) turns.push({ head: item, body: [] })
    else if (item.kind !== 'live') turns.at(-1)!.body.push(item)
  }
  return turns.filter(turn => turn.head || turn.body.length)
}

const pinned = (item: Item) => item.kind === 'custom' || item.kind === 'user'

const trailing = (item: Item) => item.kind === 'notice' || pinned(item)

const tail = (body: Item[]) => {
  let from = body.length
  while (from > 0 && trailing(body[from - 1]!)) from--
  return from
}

const answered = (body: Item[]) => body[tail(body) - 1]?.kind === 'text'

const visibleFrom = (body: Item[], running: boolean) => {
  if (running) return body.length
  const from = tail(body)
  return answered(body) ? from - 1 : from
}

const callsIn = (work: Item[]) =>
  work.reduce((count, item) => count + (item.kind === 'tools' ? item.steps.filter(step => step.kind === 'tool').length : 0), 0)

const headOf = (turn: Turn, work: Item[], running: boolean, started: number | undefined): TurnHead => {
  const times = [turn.head, ...turn.body].flatMap(item => (item ? (timeOf(item) ?? []) : []))
  const first = turn.head ? timeOf(turn.head) : times[0]
  return {
    kind: 'turn',
    key: `turn:${turn.head?.key ?? turn.body[0]!.key}`,
    running,
    start: running ? (started ?? first) : first,
    end: Math.max(0, ...times),
    calls: callsIn(work),
  }
}

const shownTurn = (turn: Turn, running: boolean, options: FoldOptions): Shown[] => {
  const from = visibleFrom(turn.body, running)
  const isWork = (item: Item, index: number) => index < from && !pinned(item)
  const work = turn.body.filter(isWork)
  const head = running || work.length ? headOf(turn, work, running, options.started) : undefined
  const expanded = head !== undefined && (running || options.open(head.key))
  const shown: Shown[] = []
  if (turn.head) shown.push({ kind: 'item', key: turn.head.key, item: turn.head, rail: false })
  if (head) shown.push(head)
  turn.body.forEach((item, index) => {
    const rail = isWork(item, index)
    if (!rail || expanded) shown.push({ kind: 'item', key: item.key, item, rail })
  })
  return shown
}

const isRunning = (turn: Turn, last: boolean, options: FoldOptions) => last && options.running && (options.streaming || !answered(turn.body))

export const foldTurns = (items: Item[], options: FoldOptions): Shown[] => {
  const turns = split(items)
  return turns.flatMap((turn, index) => shownTurn(turn, isRunning(turn, index === turns.length - 1, options), options))
}
