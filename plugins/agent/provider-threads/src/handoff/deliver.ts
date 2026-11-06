import type { Entry } from '@sand/chats/contract'
import type { Conversation, TurnInfo } from '@sand/engine/contract'
import type { HandoffStrategy, ProviderThreadInfo, Segment } from '../contract'
import type { HandoffEntry } from '../entry'
import type { HandoffStore } from '../store/handoffs'
import { fullBasis, headOf } from '../view/basis'
import type { Path } from '../view/path'
import type { Producers } from '../view/producers'
import { itemsOf } from './items'
import { coverageText, handoffText, renderItem } from './render'
import { readsHistory } from '../tools/thread-read'
import { select } from './select'

export interface HandoffInput {
  conversation: Conversation
  turn: TurnInfo
  path: Path
  thread: ProviderThreadInfo
  strategy: HandoffStrategy
  made: Producers
  budget: number
}

const coveredBy = (path: Path, thread: ProviderThreadInfo, strategy: HandoffStrategy, end: number): Entry[] => {
  if (strategy === 'delta') {
    const head = headOf(thread.seen)
    return path.entries.slice(head === null ? 0 : path.index.get(head)! + 1, end)
  }
  const { segments, from } = fullBasis(path)
  const summaries = segments.flatMap(segment => ('summary' in segment ? [path.entries[path.index.get(segment.summary)!]!] : []))
  return [...summaries, ...path.entries.slice(from, end)]
}

export const handOff = (handoffs: HandoffStore, { conversation, turn, path, thread, strategy, made, budget }: HandoffInput): Segment[] | undefined => {
  const end = path.index.get(turn.prompt) ?? path.entries.length
  const before = path.entries[end - 1]
  const covered = coveredBy(path, thread, strategy, end)
  const items = itemsOf(path, covered, made)
  if (!before || !items.length) return undefined
  const models = [...new Set(items.flatMap(item => (item.model && item.model !== thread.model ? [item.model] : [])))]
  const first = covered.reduce((low, entry) => Math.min(low, entry.seq), Infinity)
  const last = covered.reduce((high, entry) => Math.max(high, entry.seq), 0)
  const coverage = { models, first, last, reads: strategy === 'full' || readsHistory(thread) }
  const selected = select(items.map(renderItem), coverageText(coverage), budget)
  const text = handoffText(selected.context, selected.items)
  const id = handoffs.create({
    conversation,
    turn: turn.id,
    thread: thread.id,
    generation: thread.generation,
    strategy,
    first: coverage.first,
    last: coverage.last,
    context: selected.context,
    text,
    items: selected.items,
    omitted: selected.omitted,
  })
  const entry: HandoffEntry = {
    handoff: id,
    strategy,
    model: thread.model,
    from: coverage.models,
    selected: selected.items.length,
    omitted: selected.omitted.length,
    tokens: Buffer.byteLength(text),
  }
  conversation.append('handoff', entry, { turn: turn.id })
  return [...(strategy === 'delta' ? thread.seen : []), { handoff: id, to: before.id }]
}
