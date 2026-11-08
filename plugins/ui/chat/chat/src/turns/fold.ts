import type { Item } from '@sand/transcript/contract'

export type TurnPhase = 'thinking' | 'working' | 'waiting' | 'done'

export interface TurnHead {
  kind: 'turn'
  key: string
  phase: TurnPhase
  start: number | undefined
  end: number
}

export interface ShownItem {
  kind: 'item'
  key: string
  item: Item
  rail: boolean
  last: boolean
}

export type Shown = ShownItem | TurnHead

export interface FoldOptions {
  older: boolean
  running: boolean
  waiting: boolean
  streaming: boolean
  started: number | undefined
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

const begun = (body: Item[]) => body.some(item => item.kind === 'text' || item.kind === 'tools')

const phaseOf = (body: Item[], running: boolean, options: FoldOptions): TurnPhase => {
  if (!running) return 'done'
  if (options.waiting) return 'waiting'
  return begun(body) ? 'working' : 'thinking'
}

const headOf = (turn: Turn, running: boolean, options: FoldOptions): TurnHead => {
  const items = turn.head ? [turn.head, ...turn.body] : turn.body
  const times = items.flatMap(item => timeOf(item) ?? [])
  const first = turn.head ? timeOf(turn.head) : times[0]
  return {
    kind: 'turn',
    key: `turn:${items[0]!.key}`,
    phase: phaseOf(turn.body, running, options),
    start: running ? (options.started ?? first) : first,
    end: Math.max(0, ...times),
  }
}

const shownTurn = (turn: Turn, running: boolean, options: FoldOptions): Shown[] => {
  const from = visibleFrom(turn.body)
  const isWork = (item: Item, index: number) => index < from && !pinned(item)
  const cut = !turn.head && options.older
  const head = !cut && (running || turn.body.some(isWork)) ? headOf(turn, running, options) : undefined
  const expanded = head !== undefined && options.open(head.key)
  const shown: Shown[] = []
  if (turn.head) shown.push({ kind: 'item', key: turn.head.key, item: turn.head, rail: false, last: false })
  if (head) shown.push(head)
  turn.body.forEach((item, index) => {
    const rail = isWork(item, index)
    if (!rail || expanded) shown.push({ kind: 'item', key: item.key, item, rail, last: false })
  })
  return shown
}

const isRunning = (turn: Turn, last: boolean, options: FoldOptions) => last && options.running && (options.streaming || !answered(turn.body))

const isReply = (entry: Shown) => entry.kind === 'item' && entry.item.kind === 'text' && !entry.rail

export const foldTurns = (items: Item[], options: FoldOptions): Shown[] => {
  const turns = split(items)
  const shown = turns.flatMap((turn, index) => shownTurn(turn, isRunning(turn, index === turns.length - 1, options), options))
  const last = shown.findLastIndex(isReply)
  return shown.map((entry, index) => (index === last && entry.kind === 'item' ? { ...entry, last: true } : entry))
}
