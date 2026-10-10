import type { CompactionRecord } from '@sand/compaction/contract'
import type { Entry, Message, ToolCallBlock } from '@sand/messages'
import type { SessionSettings } from '@sand/model/contract'
import type { Thread } from '@sand/web-client/contract'
import type { DescribeSettings, Item, Step, ToolGroup } from '../contract'
import { feedbackLine, hasToolResult, tokens, userParts } from '@sand/kit'
import { groupAccumulator } from './groups'
import { toolResults, toolStatus } from './results'

export interface Settled {
  items: Item[]
  group: ToolGroup | undefined
  last: number
}

export const settingsText = (settings: SessionSettings) =>
  [settings.model ?? 'the default model', settings.effort && `${settings.effort} effort`, settings.speed === 'fast' && 'fast'].filter(Boolean).join(' · ')

const compactedText = ({ before, after }: CompactionRecord) =>
  before && after ? `Conversation compacted · ${tokens(before)} → ${tokens(after)} tokens` : 'Conversation compacted'

export const settledItems = (thread: Thread, path: Entry[], custom: (type: string) => boolean, describe: DescribeSettings = settingsText): Settled => {
  const results = toolResults(thread, path)
  const groups = groupAccumulator()
  const items: Item[] = []
  let last = path[0]?.at ?? Date.now()
  let talked = Boolean(path[0]?.parent)

  const emit = (...next: Item[]) => items.push(...groups.take(), ...next)

  const step = (value: Step, at: number) => groups.add(value, last, at)

  const tool = (call: ToolCallBlock, at: number) =>
    step({ kind: 'tool', key: call.id, tool: { call, result: results.get(call.id), status: toolStatus(call, thread, results), thread: thread.id } }, at)

  const thinking = (key: string, text: string, at: number) => {
    if (groups.open) step({ kind: 'thinking', key, text, streaming: false }, at)
    else items.push({ kind: 'thinking', key, text, streaming: false, at })
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
      if (block.type === 'thinking' && block.thinking.trim()) thinking(key, block.thinking, entry.at)
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

  return { items, group: groups.current, last }
}
