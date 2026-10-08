import type { Entry, Message, ToolCallBlock } from '@sand/protocol'
import { feedbackLine, promptText, userParts } from '@sand/kit'
import { actionsText, type ToolAction } from './action'

export type NodeKind = 'prompt' | 'reply' | 'step' | 'tools' | 'notification' | 'compaction' | 'setting'

export interface Described {
  kind: NodeKind
  who: string
  text: string
  detail: string
}

export type DescribeTool = (call: ToolCallBlock) => ToolAction

export interface LabelData {
  target: string
  label: string | null
}

const maxDetail = 4000

const recordNames: Record<string, string> = { usage: 'Token usage', goal: 'Goal' }

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const flat = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 200)

const described = (kind: NodeKind, who: string, text: string, detail = text): Described => ({
  kind,
  who,
  text: flat(text),
  detail: detail.trim().slice(0, maxDetail),
})

const attachments = (message: Message) =>
  message.content.flatMap(block => (block.type === 'image' || block.type === 'document' ? [`[${block.name ?? block.type}]`] : []))

const toolsNode = (kind: NodeKind, actions: ToolAction[]) => {
  const { who, text } = actionsText(actions)
  return described(kind, who, text, actions.map(action => `${action.verb} · ${action.target}`).join('\n'))
}

const user = (message: Message, calls: Map<string, ToolCallBlock>, tool: DescribeTool): Described => {
  const text = promptText(message)
  const results = message.content.flatMap(block => {
    if (block.type !== 'tool_result') return []
    const call = calls.get(block.callId)
    return [call ? tool(call) : { verb: 'Tool', target: '' }]
  })
  if (results.length) return toolsNode('tools', results)
  const task = userParts(message).flatMap(part => (part.kind === 'notification' ? [part.notification] : []))[0]
  if (task && !text.trim()) return described('notification', 'Agent', `${task.label} — ${task.status}`)
  const feedback = userParts(message).flatMap(part => (part.kind === 'feedback' ? [part.feedback] : []))[0]
  if (feedback && !text.trim()) return described('notification', capitalize(feedback.source), feedbackLine(feedback), feedback.text)
  const shown = [text, ...attachments(message)].join(' ')
  return described('prompt', 'You', shown, [text, ...attachments(message)].join('\n'))
}

const assistant = (message: Message, tool: DescribeTool): Described => {
  const text = message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n\n')
  if (text.trim()) return described('reply', 'sand', text)
  const calls = message.content.flatMap(block => (block.type === 'tool_call' ? [tool(block)] : []))
  return calls.length ? toolsNode('step', calls) : described('step', 'sand', '(no content)')
}

const setting = (entry: Entry) => {
  if (entry.type === 'system') return described('setting', 'Setting', 'System prompt')
  if (entry.type === 'agent') return described('setting', 'Setting', `Agent: ${(entry.data as { name?: string }).name ?? 'unknown'}`)
  if (entry.type === 'label') return described('setting', 'Label', (entry.data as LabelData).label ?? 'cleared')
  if (entry.type === 'settings') return described('setting', 'Setting', 'Model settings')
  return described('setting', 'Note', recordNames[entry.type] ?? entry.type)
}

export const describe = (entry: Entry, calls: Map<string, ToolCallBlock>, tool: DescribeTool): Described => {
  if (entry.type === 'compaction') return described('compaction', 'Compacted', 'Earlier messages were summarized')
  if (entry.type !== 'message') return setting(entry)
  const message = entry.data as Message
  return message.role === 'user' ? user(message, calls, tool) : assistant(message, tool)
}

export const isPrompt = (entry: Entry) => describe(entry, new Map(), () => ({ verb: '', target: '' })).kind === 'prompt'
