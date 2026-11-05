import { type Block, type Entry, fileText, type Message, textOf, type ToolReferenceBlock, type ToolResultBlock } from '@sand/chats/contract'
import type { TurnEnding } from '@sand/turns-contract/contract'
import type { Path } from '../view/path'
import { resetOf } from '../view/path'
import type { Producers } from '../view/producers'

export type ItemKind = 'prompt' | 'reply' | 'tool' | 'summary' | 'note'

export interface Item {
  id: string
  role: 'user' | 'assistant'
  kind: ItemKind
  seq: number
  model?: string
  text: string
  output?: string
}

const inputLimit = 800

const notes: Partial<Record<TurnEnding['stopReason'], string>> = {
  interrupted: 'The user interrupted this turn.',
  lost: 'Sand stopped while this turn ran; it did not finish.',
}

const clip = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, limit)}…` : text)

const blockText = (block: Block | ToolReferenceBlock): string | undefined => {
  switch (block.type) {
    case 'text':
      return block.text
    case 'file':
      return fileText(block)
    case 'image':
    case 'document':
      return `[${block.type}: ${block.name ?? 'unnamed'}]`
    default:
      return undefined
  }
}

const contentText = (content: (Block | ToolReferenceBlock)[]) => content.flatMap(block => blockText(block) ?? []).join('\n')

const resultsOf = (path: Path) =>
  new Map(
    path.entries.flatMap(entry =>
      entry.type === 'message' ? (entry.data as Message).content.flatMap(block => (block.type === 'tool_result' ? [[block.callId, block] as const] : [])) : [],
    ),
  )

const outcome = (result: ToolResultBlock | undefined) => {
  if (!result) return 'no result'
  return result.isError ? 'error' : 'ok'
}

export const itemsOf = (path: Path, entries: Entry[], made: Producers): Item[] => {
  const results = resultsOf(path)

  const item = (entry: Entry, kind: ItemKind, role: Item['role'], text: string, id = entry.id): Item => {
    const model = made.get(entry.id)
    return { id, role, kind, seq: entry.seq, ...(model && { model }), text }
  }

  const fromMessage = (entry: Entry, message: Message): Item[] => {
    if (message.role === 'user') {
      const text = contentText(message.content.filter(block => block.type !== 'tool_result'))
      return text ? [item(entry, 'prompt', 'user', text)] : []
    }
    const reply = textOf(message.content)
    const tools = message.content.flatMap(block => {
      if (block.type !== 'tool_call') return []
      const result = results.get(block.id)
      const call = `Tool ${block.name}(${clip(JSON.stringify(block.input ?? {}), inputLimit)}) → ${outcome(result)}`
      const output = result ? contentText(result.content) : ''
      return [{ ...item(entry, 'tool', 'assistant', call, `${entry.id}#${block.id}`), ...(output && { output }) }]
    })
    return [...(reply ? [item(entry, 'reply', 'assistant', reply)] : []), ...tools]
  }

  const fromEntry = (entry: Entry): Item[] => {
    if (resetOf(path, entry)) {
      const summary = path.views.get(entry.type)?.message(entry, path.entries)
      return summary ? [item(entry, 'summary', 'user', textOf(summary.content))] : []
    }
    if (entry.type === 'message') return fromMessage(entry, entry.data as Message)
    const note = entry.type === 'turn-ending' ? notes[(entry.data as TurnEnding).stopReason] : undefined
    return note ? [item(entry, 'note', 'assistant', note)] : []
  }

  return entries.flatMap(fromEntry)
}
