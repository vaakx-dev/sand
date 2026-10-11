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
  diffs?: boolean
}

export interface Collected extends Changes {
  callTurns: Map<string, number>
  lastTurn: number
}

interface Edit {
  path: string
  hunk: DiffLine[]
  add: number
  del: number
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const inputOf = (call: ToolCallBlock) => (isRecord(call.input) ? call.input : {})

const editedPath = (call: ToolCallBlock) => (call.name === 'edit' || call.name === 'write' ? text(inputOf(call).path) : '')

const hunkOf = (call: ToolCallBlock) => {
  const input = inputOf(call)
  if (call.name === 'edit') return diffLines(text(input.old_string), text(input.new_string), { context: 3 })
  return diffLines('', text(input.content), { context: 3 })
}

const edits = new WeakMap<ToolCallBlock, Edit>()

const editOf = (call: ToolCallBlock) => {
  const path = editedPath(call)
  if (!path) return
  const cached = edits.get(call)
  if (cached) return cached
  const hunk = hunkOf(call)
  const edit = { path, hunk, ...diffCounts(hunk) }
  edits.set(call, edit)
  return edit
}

const nameOf = (call: ToolCallBlock): Edit | undefined => {
  const path = editedPath(call)
  return path ? { path, hunk: [], add: 0, del: 0 } : undefined
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

const addEdit = (file: FileChange, edit: Edit, turn: number) => {
  file.hunks.push(edit.hunk)
  file.add += edit.add
  file.del += edit.del
  file.turns.add(turn)
}

export const collectChanges = (entries: Entry[], { cwd, turn, failing = [], id, agent, fixedTurn, diffs = true }: CollectOptions): Collected => {
  const read = diffs ? editOf : nameOf
  const failed = failedCalls(entries, failing)
  const files = new Map<string, FileChange>()
  const turns = new Set<number>()
  const callTurns = new Map<string, number>()
  let current = fixedTurn ?? 0

  const record = (call: ToolCallBlock) => {
    callTurns.set(call.id, current)
    if (failed.has(call.id)) return
    const edit = read(call)
    if (!edit) return
    turns.add(current)
    if (turn !== undefined && turn !== current) return
    const name = shown(edit.path, cwd)
    const key = id ? `${id}:${name}` : name
    const file = files.get(key) ?? { key, path: name, agent, outside: !inside(edit.path, cwd), add: 0, del: 0, hunks: [], turns: new Set<number>() }
    addEdit(file, edit, current)
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
