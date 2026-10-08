import type { CompactionRecord, Entry, LiveBlock, Message, SessionSettings, Thread, ToolCallBlock, ToolView } from '@sand/protocol'
import { feedbackLine, hasToolResult, tokens, userParts } from '@sand/kit'
import { groupAccumulator } from './groups'
import { partialInput, toolResults, toolStatus } from './results'
import type { Item, NoticeTone, Step } from './types'

type DescribeSettings = (settings: SessionSettings) => string | undefined

const endings: Record<string, { text: string; tone: NoticeTone }> = {
  interrupted: { text: 'Interrupted', tone: 'dim' },
  error: { text: 'The turn failed', tone: 'error' },
  refusal: { text: 'The model declined to continue', tone: 'error' },
  max_tokens: { text: 'Stopped at the output token limit', tone: 'error' },
}

const settingsText = (settings: SessionSettings) =>
  [settings.model ?? 'the default model', settings.effort && `${settings.effort} effort`, settings.speed === 'fast' && 'fast'].filter(Boolean).join(' · ')

const compactedText = ({ before, after }: CompactionRecord) =>
  before && after ? `Conversation compacted · ${tokens(before)} → ${tokens(after)} tokens` : 'Conversation compacted'

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

export const threadItems = (thread: Thread, path: Entry[], custom: (type: string) => boolean, describe: DescribeSettings = settingsText): Item[] => {
  const results = toolResults(thread, path)
  const groups = groupAccumulator()
  const items: Item[] = []
  let last = path[0]?.at ?? Date.now()
  let talked = false

  const emit = (...next: Item[]) => items.push(...groups.take(), ...next)

  const step = (value: Step, at: number) => groups.add(value, last, at)

  const tool = (call: ToolCallBlock, at: number) =>
    step({ kind: 'tool', key: call.id, tool: { call, result: results.get(call.id), status: toolStatus(call, thread, results), thread: thread.id } }, at)

  const thinking = (key: string, text: string, streaming: boolean, at: number) => {
    if (groups.open) step({ kind: 'thinking', key, text, streaming }, at)
    else items.push({ kind: 'thinking', key, text, streaming, at })
  }

  const user = (entry: Entry, message: Message) => {
    groups.touch(entry.at)
    const parts = userParts(message)
    if (!parts.length) return
    const shown = parts.filter(part => part.kind !== 'notification' && part.kind !== 'feedback')
    const notes = parts.flatMap(part => (part.kind === 'notification' ? [part.notification] : []))
    const feedback = parts.flatMap(part => (part.kind === 'feedback' ? [part.feedback] : []))
    const asked: Item[] = shown.length ? [{ kind: 'user', key: entry.id, parts: shown, steer: hasToolResult(message), at: entry.at }] : []
    emit(
      ...asked,
      ...notes.map((notification, index): Item => ({ kind: 'notification', key: `${entry.id}:n${index}`, notification, at: entry.at })),
      ...feedback.map((note, index): Item => ({ kind: 'notice', key: `${entry.id}:f${index}`, text: feedbackLine(note), tone: 'dim' })),
    )
  }

  const assistant = (entry: Entry, message: Message) =>
    message.content.forEach((block, index) => {
      const key = `${entry.parent}:${index}`
      if (block.type === 'text' && block.text.trim()) emit({ kind: 'text', key, text: block.text, streaming: false, at: entry.at })
      if (block.type === 'thinking' && block.thinking.trim()) thinking(key, block.thinking, false, entry.at)
      if (block.type === 'tool_call') tool(block, entry.at)
    })

  const settings = (entry: Entry) => {
    emit()
    if (items.at(-1)?.key.startsWith('settings:')) items.pop()
    const text = describe(entry.data as SessionSettings) ?? settingsText(entry.data as SessionSettings)
    items.push({ kind: 'notice', key: `settings:${entry.id}`, text: `${talked ? 'Switched to' : 'Using'} ${text}`, tone: 'rule' })
  }

  for (const entry of path) {
    if (custom(entry.type)) emit({ kind: 'custom', key: entry.id, entry })
    else if (entry.type === 'compaction') emit({ kind: 'notice', key: entry.id, text: compactedText(entry.data as CompactionRecord), tone: 'dim' })
    else if (entry.type === 'settings') settings(entry)
    else if (entry.type === 'message') {
      const message = entry.data as Message
      talked = true
      if (message.role === 'user') user(entry, message)
      else assistant(entry, message)
    }
    last = entry.at
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
  else if (thread.running && !isStreaming(items.at(-1))) items.push({ kind: 'live', key: 'live' })
  items.push(...endingNotice(thread))
  return items
}
