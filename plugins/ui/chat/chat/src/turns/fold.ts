import type { ToolCallBlock } from '@sand/chats/contract'
import { thought, type Item } from '@sand/transcript/contract'
import { summaryOf } from './summary'

export type TurnPhase = 'thinking' | 'working' | 'waiting' | 'done'

export interface TurnHead {
  kind: 'turn'
  key: string
  phase: TurnPhase
  start: number | undefined
  end: number
  summary: string
  stepStarted: number | undefined
  thought: LiveThought | undefined
}

export interface LiveThought {
  key: string
  body: string
}

export interface ShownItem {
  kind: 'item'
  key: string
  item: Item
  rail: boolean
  last: boolean
}

export type Shown = ShownItem | TurnHead

export type Unfold = { kind: 'shown' } | { kind: 'turn'; key: string } | { kind: 'hidden' }

export interface FoldOptions {
  older: boolean
  running: boolean
  waiting: boolean
  streaming: boolean
  started: number | undefined
  nested: ToolCallBlock[]
  open(key: string): boolean
}

interface Turn {
  head?: Item
  body: Item[]
}

interface Replies {
  replies: Set<number>
  next: Item | undefined
}

const REPLY_LENGTH = 280

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

const closes = (next: Item | undefined) => next === undefined || pinned(next)

const substantial = (text: string) => {
  const trimmed = text.trim()
  return trimmed.includes('\n') || trimmed.length >= REPLY_LENGTH
}

const replying = (item: Item, next: Item | undefined) => item.kind === 'text' && (closes(next) || substantial(item.text))

const repliesOf = (body: Item[]) =>
  body.reduceRight<Replies>(
    ({ replies, next }, item, index) => ({
      replies: replying(item, next) ? replies.add(index) : replies,
      next: item.kind === 'notice' ? next : item,
    }),
    { replies: new Set(), next: undefined },
  ).replies

const begun = (body: Item[]) => body.some(item => item.kind === 'text' || item.kind === 'tools')

const phaseOf = (body: Item[], running: boolean, options: FoldOptions): TurnPhase => {
  if (!running) return 'done'
  if (options.waiting) return 'waiting'
  return begun(body) ? 'working' : 'thinking'
}

const timedOf = (turn: Turn) => {
  const worked = turn.body.slice(0, tail(turn.body))
  return turn.head ? [turn.head, ...worked] : worked
}

const runningStarts = (item: Item) =>
  item.kind === 'tools' ? item.steps.flatMap(step => (step.kind === 'tool' && step.tool.status === 'running' && step.tool.started ? [step.tool.started] : [])) : []

const stepStartedOf = (work: Item[]) => {
  const starts = work.flatMap(runningStarts)
  return starts.length ? Math.min(...starts) : undefined
}

const thoughtsOf = (item: Item): LiveThought[] => {
  if (item.kind === 'thinking') return [{ key: item.key, body: thought(item.text).body }]
  if (item.kind === 'tools') return item.steps.flatMap(step => (step.kind === 'thinking' ? [{ key: step.key, body: thought(step.text).body }] : []))
  return []
}

const newestThought = (work: Item[]) => work.flatMap(thoughtsOf).findLast(({ body }) => body)

const headOf = (turn: Turn, work: Item[], running: boolean, options: FoldOptions): TurnHead => {
  const items = turn.head ? [turn.head, ...turn.body] : turn.body
  const times = timedOf(turn).flatMap(item => timeOf(item) ?? [])
  const first = turn.head ? timeOf(turn.head) : times[0]
  const phase = phaseOf(turn.body, running, options)
  return {
    kind: 'turn',
    key: `turn:${items[0]!.key}`,
    phase,
    start: running ? (options.started ?? first) : first,
    end: Math.max(0, ...times),
    summary: summaryOf(work, options.nested),
    stepStarted: phase === 'working' ? stepStartedOf(work) : undefined,
    thought: running ? newestThought(work) : undefined,
  }
}

const shownTurn = (turn: Turn, running: boolean, options: FoldOptions): Shown[] => {
  const from = tail(turn.body)
  const replies = repliesOf(turn.body)
  const isWork = (item: Item, index: number) => index < from && !pinned(item) && !replies.has(index)
  const work = turn.body.filter(isWork)
  const cut = !turn.head && options.older
  const head = !cut && (running || work.length) ? headOf(turn, work, running, options) : undefined
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

export const unfolding = (items: Item[], key: string, options: FoldOptions): Unfold => {
  const isItem = (entry: Shown) => entry.kind === 'item' && entry.key === key
  if (foldTurns(items, options).some(isItem)) return { kind: 'shown' }
  const opened = foldTurns(items, { ...options, open: () => true })
  const at = opened.findIndex(isItem)
  const head = opened.slice(0, Math.max(0, at)).findLast(entry => entry.kind === 'turn')
  return head ? { kind: 'turn', key: head.key } : { kind: 'hidden' }
}
