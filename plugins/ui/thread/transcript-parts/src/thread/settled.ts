import type { CompactionRecord } from '@sand/compaction/contract'
import type { Entry, Message, ToolCallBlock, UserPart } from '@sand/messages'
import type { SessionSettings } from '@sand/model/contract'
import type { Thread } from '@sand/web-client/contract'
import type { DescribeSettings, Item, ToolGroup } from '../contract'
import { feedbackLine, hasToolResult, tokens, userParts } from '@sand/kit'
import { itemCollector } from './collect'
import { toolResults, toolStatus } from './results'

export interface Settled {
  items: Item[]
  group: ToolGroup | undefined
  last: number
}

const settingsText = (settings: SessionSettings) =>
  [settings.model ?? 'no model chosen', settings.effort && `${settings.effort} effort`, settings.speed === 'fast' && 'fast'].filter(Boolean).join(' · ')

const compactedText = ({ before, after }: CompactionRecord) =>
  before && after ? `Conversation compacted · ${tokens(before)} → ${tokens(after)} tokens` : 'Conversation compacted'

const userItems = (entry: Entry, parts: UserPart[], steer: boolean): Item[] => {
  const shown = parts.filter(part => part.kind !== 'notification' && part.kind !== 'feedback')
  const notes = parts.flatMap(part => (part.kind === 'notification' ? [part.notification] : []))
  const feedback = parts.flatMap(part => (part.kind === 'feedback' ? [part.feedback] : []))
  const asked: Item[] = shown.length ? [{ kind: 'user', key: entry.id, parts: shown, steer, at: entry.at }] : []
  return [
    ...asked,
    ...notes.map((notification, index): Item => ({ kind: 'notification', key: `${entry.id}:n${index}`, notification, steer, at: entry.at })),
    ...feedback.map((note, index): Item => ({ kind: 'notice', key: `${entry.id}:f${index}`, text: feedbackLine(note), tone: 'dim' })),
  ]
}

export const settledItems = (thread: Thread, path: Entry[], custom: (type: string) => boolean, describe: DescribeSettings): Settled => {
  const results = toolResults(thread, path)
  const list = itemCollector()
  let last = path[0]?.at ?? Date.now()
  let talked = Boolean(path[0]?.parent)

  const tool = (call: ToolCallBlock, at: number) =>
    list.step({ kind: 'tool', key: call.id, tool: { call, result: results.get(call.id), status: toolStatus(call, thread, results), thread: thread.id } }, last, at)

  const user = (entry: Entry, message: Message) => {
    list.extend(entry.at)
    const parts = userParts(message)
    if (parts.length) list.emit(...userItems(entry, parts, hasToolResult(message)))
  }

  const assistant = (entry: Entry, message: Message) =>
    message.content.forEach((block, index) => {
      const key = `${entry.parent}:${index}`
      if (block.type === 'text' && block.text.trim()) list.emit({ kind: 'text', key, text: block.text, streaming: false, at: entry.at })
      if (block.type === 'thinking' && block.thinking.trim()) list.thinking(key, block.thinking, false, entry.at)
      if (block.type === 'tool_call') tool(block, entry.at)
    })

  const settings = (entry: Entry) => {
    list.close()
    if (list.items.at(-1)?.key.startsWith('settings:')) list.items.pop()
    const chosen = entry.data as SessionSettings
    const text = describe(chosen) ?? settingsText(chosen)
    list.items.push({ kind: 'notice', key: `settings:${entry.id}`, text: `${talked ? 'Switched to' : 'Using'} ${text}`, tone: 'rule' })
  }

  for (const entry of path) {
    if (custom(entry.type)) list.emit({ kind: 'custom', key: entry.id, entry })
    else if (entry.type === 'compaction') list.emit({ kind: 'notice', key: entry.id, text: compactedText(entry.data as CompactionRecord), tone: 'dim' })
    else if (entry.type === 'settings') settings(entry)
    else if (entry.type === 'message') {
      const message = entry.data as Message
      talked = true
      if (message.role === 'user') user(entry, message)
      else assistant(entry, message)
    }
    last = entry.at
  }

  return { items: list.items, group: list.group, last }
}
