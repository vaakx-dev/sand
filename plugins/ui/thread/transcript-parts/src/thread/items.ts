import type { LiveBlock } from '@sand/llm-accounts/contract'
import type { Entry } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import type { DescribeSettings, Item, NoticeTone, ToolView } from '../contract'
import { tokens } from '@sand/kit'
import { itemCollector } from './collect'
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
  const list = itemCollector(settled.group)
  const now = Date.now()
  for (const block of thread.live) {
    const key = `${thread.info.head}:${block.index}`
    if (block.type === 'text') list.emit({ kind: 'text', key, text: block.text, streaming: !block.done, at: now })
    else if (block.type === 'thinking') list.thinking(key, block.text, !block.done, now)
    else if (block.type === 'tool') list.step({ kind: 'tool', key: block.id, tool: liveTool(block, thread) }, settled.last, now)
  }

  if (thread.context?.compacting) list.emit({ kind: 'notice', key: 'compacting', text: `Compacting conversation at ${tokens(thread.context.used)} tokens…`, tone: 'dim' })
  if (list.group) list.close(thread.running)
  else if (thread.running && !isStreaming(list.items.at(-1) ?? settled.items.at(-1))) list.items.push({ kind: 'live', key: 'live' })
  list.items.push(...endingNotice(thread))
  return settled.items.concat(list.items)
}

export const threadItems = (thread: Thread, path: Entry[], custom: (type: string) => boolean, describe: DescribeSettings): Item[] =>
  liveItems(settledItems(thread, path, custom, describe), thread)
