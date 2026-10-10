import type { LiveBlock } from '@sand/llm-accounts/contract'
import type { Entry } from '@sand/messages'
import type { ToolView } from '@sand/transcript-chat/contract'
import type { Thread } from '@sand/web-client/contract'
import type { DescribeSettings, Item, NoticeTone, Step } from '../contract'
import { tokens } from '@sand/kit'
import { groupAccumulator } from './groups'
import { partialInput } from './results'
import { settledItems, type Settled } from './settled'

const endings: Record<string, { text: string; tone: NoticeTone }> = {
  interrupted: { text: 'Interrupted', tone: 'dim' },
  error: { text: 'The turn failed', tone: 'error' },
  refusal: { text: 'The model declined to continue', tone: 'error' },
  max_tokens: { text: 'Stopped at the output token limit', tone: 'error' },
}

const isStreaming = (item?: Item) => (item?.kind === 'text' || item?.kind === 'thinking') && item.streaming

const liveTool = (block: Extract<LiveBlock, { type: 'tool' }>, thread: Thread): ToolView => ({
  call: { type: 'tool_call', id: block.id, name: block.name, input: partialInput(block.input) },
  status: 'pending',
  thread: thread.id,
})

const endingNotice = (thread: Thread): Item[] => {
  const ending = !thread.running && thread.ended && endings[thread.ended.stopReason]
  if (!ending) return []
  const text = thread.ended?.error ? `${ending.text}: ${thread.ended.error}` : ending.text
  return [{ kind: 'notice', key: `ended:${thread.info.head}`, text, tone: ending.tone }]
}

export const liveItems = (settled: Settled, thread: Thread): Item[] => {
  const groups = groupAccumulator(settled.group)
  const items: Item[] = []

  const emit = (...next: Item[]) => items.push(...groups.take(), ...next)

  const step = (value: Step, at: number) => groups.add(value, settled.last, at)

  const thinking = (key: string, text: string, streaming: boolean, at: number) => {
    if (groups.open) step({ kind: 'thinking', key, text, streaming }, at)
    else items.push({ kind: 'thinking', key, text, streaming, at })
  }

  const now = Date.now()
  for (const block of thread.live) {
    const key = `${thread.info.head}:${block.index}`
    if (block.type === 'text') emit({ kind: 'text', key, text: block.text, streaming: !block.done, at: now })
    else if (block.type === 'thinking') thinking(key, block.text, !block.done, now)
    else if (block.type === 'tool') step({ kind: 'tool', key: block.id, tool: liveTool(block, thread) }, now)
  }

  if (thread.context?.compacting) emit({ kind: 'notice', key: 'compacting', text: `Compacting conversation at ${tokens(thread.context.used)} tokens…`, tone: 'dim' })
  if (groups.open) items.push(...groups.take(thread.running))
  else if (thread.running && !isStreaming(items.at(-1) ?? settled.items.at(-1))) items.push({ kind: 'live', key: 'live' })
  items.push(...endingNotice(thread))
  return settled.items.concat(items)
}

export const threadItems = (thread: Thread, path: Entry[], custom: (type: string) => boolean, describe?: DescribeSettings): Item[] =>
  liveItems(settledItems(thread, path, custom, describe), thread)
