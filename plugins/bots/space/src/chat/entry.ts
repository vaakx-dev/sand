import { routineRecord } from '@sand/bot-routines/contract'
import type { BotEntry } from '@sand/bots/contract'
import { textOf, type Message } from '@sand/chats/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { isRecord } from '@sand/util'
import { div, dynamicChild, span, type Derive } from '@vaakx-dev/vrui'

export type Line = { id: string; kind: Message['role'] | 'error' | 'routine'; text: string }

const isMessage = (data: unknown): data is Message =>
  isRecord(data) && (data.role === 'user' || data.role === 'assistant') && Array.isArray(data.content)

const routineOf = (message: Message) =>
  message.content.flatMap(block => (block.type === 'context' ? block.records : [])).find(record => record.kind === routineRecord)

const failureOf = (data: unknown) => (isRecord(data) && typeof data.error === 'string' && data.error ? data.error : undefined)

const lineOf = ({ id, type, data }: BotEntry): Line[] => {
  if (type === 'turn-ending') {
    const error = failureOf(data)
    return error ? [{ id, kind: 'error', text: error }] : []
  }
  if (type !== 'message' || !isMessage(data)) return []
  const routine = routineOf(data)
  if (routine) return [{ id, kind: 'routine', text: `${routine.data.repeats === true ? 'Routine' : 'Reminder'} · ${routine.label}` }]
  const text = textOf(data.content, '\n\n').trim()
  return text ? [{ id, kind: data.role, text }] : []
}

export const linesOf = (entries: BotEntry[]) => entries.flatMap(lineOf)

const userLine = (text: string) =>
  div(
    { class: 'mt-6 mb-3 flex justify-end', 'data-line': '' },
    div({ class: 'min-w-0 max-w-2xl rounded-xl bg-neutral-800 px-4 py-3 text-sm text-neutral-100 whitespace-pre-wrap wrap-anywhere' }, text),
  )

const replyText = (text: string, markdown: Markdown | undefined) =>
  markdown ? div({ class: 'leading-relaxed wrap-anywhere' }, ...markdown.nodes(text)) : div({ class: 'leading-relaxed whitespace-pre-wrap wrap-anywhere' }, text)

export const replyLine = (text: string, markdown: Derive<Markdown | undefined>) =>
  div(
    { class: 'mb-3 text-sm text-neutral-100', 'data-line': '' },
    dynamicChild(markdown, found => replyText(text, found)),
  )

const routineLine = (kit: Kit, text: string) => div({ 'data-line': '' }, kit.markerLine({ icon: 'clock' }, span({ class: 'min-w-0 truncate' }, text)))

const errorLine = (kit: Kit, text: string) => div({ class: 'mb-3', 'data-line': '' }, kit.errorText(text))

export const lineView = (kit: Kit, line: Line, markdown: Derive<Markdown | undefined>) => {
  if (line.kind === 'user') return userLine(line.text)
  if (line.kind === 'assistant') return replyLine(line.text, markdown)
  if (line.kind === 'routine') return routineLine(kit, line.text)
  return errorLine(kit, line.text)
}
