import type { Entry, Message, ToolCallBlock, ToolResultBlock } from '@sand/messages'
import { callsOf, diffCounts, type DiffLine, diffLines, grouped, hasToolResult, isInside, isRecord, readAtLine, textOf, tildeHome, userParts } from '@sand/kit'

export interface Hunk {
  lines: DiffLine[]
  start?: number
}

export interface FileChange {
  key: string
  path: string
  agent?: string
  outside: boolean
  add: number
  del: number
  hunks: Hunk[]
  turns: Set<number>
}

export interface Changes {
  files: FileChange[]
  turns: number[]
}

export interface CollectOptions {
  cwd: string
  turn?: number
  results?: ToolResultBlock[]
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
  lines: DiffLine[]
  add: number
  del: number
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const inputOf = (call: ToolCallBlock) => (isRecord(call.input) ? call.input : {})

const editedPath = (call: ToolCallBlock) => (call.name === 'edit' || call.name === 'write' ? text(inputOf(call).path) : '')

const linesOf = (call: ToolCallBlock) => {
  const input = inputOf(call)
  if (call.name === 'edit') return diffLines(text(input.old_string), text(input.new_string))
  return diffLines('', text(input.content))
}

const edits = new WeakMap<ToolCallBlock, Edit>()

const editOf = (call: ToolCallBlock) => {
  const path = editedPath(call)
  if (!path) return
  const cached = edits.get(call)
  if (cached) return cached
  const lines = linesOf(call)
  const edit = { path, lines, ...diffCounts(lines) }
  edits.set(call, edit)
  return edit
}

const nameOf = (call: ToolCallBlock): Edit | undefined => {
  const path = editedPath(call)
  return path ? { path, lines: [], add: 0, del: 0 } : undefined
}

const starts = new WeakMap<ToolResultBlock, number | undefined>()

const startIn = (result: ToolResultBlock) => {
  if (!starts.has(result)) starts.set(result, readAtLine(textOf(result.content)))
  return starts.get(result)
}

const startOf = (call: ToolCallBlock, result: ToolResultBlock | undefined) => {
  if (call.name === 'write') return 1
  return result && startIn(result)
}

const absolute = (path: string) => path.startsWith('/') || path.startsWith('~') || path.startsWith('\\\\') || /^[A-Za-z]:[\\/]/.test(path)

const inside = (path: string, cwd: string) => !absolute(path) || isInside(path, cwd)

const shown = (path: string, cwd: string) => {
  if (isInside(path, cwd)) return path.slice(cwd.length).replace(/^[\\/]+/, '')
  return absolute(path) ? tildeHome(path) : path
}

const resultsOf = (entries: Entry[], live: ToolResultBlock[]) => {
  const results = new Map(live.map(result => [result.callId, result]))
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_result') results.set(block.callId, block)
  }
  return results
}

const isPrompt = (message: Message) =>
  message.role === 'user' && !hasToolResult(message) && userParts(message).some(part => part.kind !== 'feedback') && message.content.some(block => block.type === 'text')

const addEdit = (file: FileChange, edit: Edit, start: number | undefined, turn: number) => {
  file.hunks.push({ lines: edit.lines, start })
  file.add += edit.add
  file.del += edit.del
  file.turns.add(turn)
}

export const collectChanges = (entries: Entry[], { cwd, turn, results: live = [], id, agent, fixedTurn, diffs = true }: CollectOptions): Collected => {
  const read = diffs ? editOf : nameOf
  const results = resultsOf(entries, live)
  const files = new Map<string, FileChange>()
  const turns = new Set<number>()
  const callTurns = new Map<string, number>()
  const names = new Map<string, string>()
  let current = fixedTurn ?? 0

  const record = (call: ToolCallBlock) => {
    callTurns.set(call.id, current)
    const result = results.get(call.id)
    if (result?.isError) return
    const edit = read(call)
    if (!edit) return
    turns.add(current)
    if (turn !== undefined && turn !== current) return
    const name = grouped(names, edit.path, () => shown(edit.path, cwd))
    const key = id ? `${id}:${name}` : name
    const file = files.get(key) ?? { key, path: name, agent, outside: !inside(edit.path, cwd), add: 0, del: 0, hunks: [], turns: new Set<number>() }
    addEdit(file, edit, startOf(call, result), current)
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
