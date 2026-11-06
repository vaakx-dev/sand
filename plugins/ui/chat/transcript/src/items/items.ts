import type { LiveBlock } from '@sand/accounts/contract'
import type { Item, Settled, Source, ToolView } from '../contract'
import { tokens } from '@sand/util'
import { itemCollector } from './collect'
import { withProgress } from './progress'
import { partialInput } from './results'

const isStreaming = (item?: Item) => (item?.kind === 'text' || item?.kind === 'thinking') && item.streaming

const liveTool = (block: Extract<LiveBlock, { type: 'tool' }>, source: Source): ToolView => ({
  call: { type: 'tool_call', id: block.id, name: block.name, input: partialInput(block.input) },
  status: 'pending',
  thread: source.id,
})

export const liveItems = (cached: Settled, source: Source): Item[] => {
  const settled = source.tools ? withProgress(cached, source.tools.logs) : cached
  const list = itemCollector(settled.group)
  const now = Date.now()
  for (const block of source.live) {
    const key = `${settled.head}:${block.index}`
    if (block.type === 'text') list.emit({ kind: 'text', key, text: block.text, streaming: !block.done, at: now })
    else if (block.type === 'thinking') list.thinking(key, block.text, !block.done, now)
    else if (block.type === 'tool') list.step({ kind: 'tool', key: block.id, tool: liveTool(block, source) }, settled.last, now)
  }

  if (source.context?.compacting) list.emit({ kind: 'notice', key: 'compacting', text: `Compacting conversation at ${tokens(source.context.used)} tokens…`, tone: 'dim' })
  if (list.group) list.close(source.running)
  else if (source.running && !isStreaming(list.items.at(-1) ?? settled.items.at(-1))) list.items.push({ kind: 'live', key: 'live' })
  return settled.items.concat(list.items)
}
