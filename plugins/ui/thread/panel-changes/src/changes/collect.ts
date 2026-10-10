import type { Entry, Message, ToolCallBlock } from '@sand/messages'
import { callsOf, diffCounts, type DiffLine, diffLines, hasToolResult, isInside, isRecord, tildeHome, userParts } from '@sand/kit'

export interface FileChange {
  key: string
  path: string
  agent?: string
  outside: boolean
  add: number
  del: number
  hunks: DiffLine[][]
  turns: Set<number>
}

export interface Changes {
  files: FileChange[]
  turns: number[]
}

export interface CollectOptions {
  cwd: string
  turn?: number
  failing?: Iterable<string>
  id?: string
  agent?: string
  fixedTurn?: number
}

export interface Collected extends Changes {
  callTurns: Map<string, number>
  lastTurn: number
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const editOf = (call: ToolCallBlock) => {
  const input = isRecord(call.input) ? call.input : {}
  const path = text(input.path)
  if (!path) return
  if (call.name === 'edit') return { path, hunk: diffLines(text(input.old_string), text(input.new_string), { context: 3 }) }
  if (call.name === 'write') return { path, hunk: diffLines('', text(input.content), { context: 3 }) }
}

const absolute = (path: string) => path.startsWith('/') || path.startsWith('~') || path.startsWith('\\\\') || /^[A-Za-z]:[\\/]/.test(path)

const inside = (path: string, cwd: string) => !absolute(path) || isInside(path, cwd)

const shown = (path: string, cwd: string) => {
  if (isInside(path, cwd)) return path.slice(cwd.length).replace(/^[\\/]+/, '')
  return absolute(path) ? tildeHome(path) : path
}

const failedCalls = (entries: Entry[], failing: Iterable<string>) => {
  const failed = new Set(failing)
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_result' && block.isError) failed.add(block.callId)
  }
  return failed
}

const isPrompt = (message: Message) =>
  message.role === 'user' && !hasToolResult(message) && userParts(message).some(part => part.kind !== 'feedback') && message.content.some(block => block.type === 'text')

const addHunk = (file: FileChange, hunk: DiffLine[], turn: number) => {
  const { add, del } = diffCounts(hunk)
  file.hunks.push(hunk)
  file.add += add
  file.del += del
  file.turns.add(turn)
}

export const collectChanges = (entries: Entry[], { cwd, turn, failing = [], id, agent, fixedTurn }: CollectOptions): Collected => {
  const failed = failedCalls(entries, failing)
  const files = new Map<string, FileChange>()
  const turns = new Set<number>()
  const callTurns = new Map<string, number>()
  let current = fixedTurn ?? 0

  const record = (call: ToolCallBlock) => {
    callTurns.set(call.id, current)
    if (failed.has(call.id)) return
    const edit = editOf(call)
    if (!edit) return
    turns.add(current)
    if (turn !== undefined && turn !== current) return
    const name = shown(edit.path, cwd)
    const key = id ? `${id}:${name}` : name
    const file = files.get(key) ?? { key, path: name, agent, outside: !inside(edit.path, cwd), add: 0, del: 0, hunks: [], turns: new Set<number>() }
    addHunk(file, edit.hunk, current)
    files.set(key, file)
  }

  for (const entry of entries) {
    if (entry.type !== 'message') continue
    const message = entry.data as Message
    if (fixedTurn === undefined && isPrompt(message)) current++
    if (message.role === 'assistant') callsOf(message).forEach(record)
  }
  return { files: [...files.values()], turns: [...turns], callTurns, lastTurn: current }
}
