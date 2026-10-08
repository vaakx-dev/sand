import type { Entry, Message, ToolCallBlock } from '@sand/protocol'
import { diffCounts, type DiffLine, diffLines, hasToolResult, tildeHome, userParts } from '@sand/kit'

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

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const hunkOf = (call: ToolCallBlock): DiffLine[] | undefined => {
  const input = (call.input ?? {}) as Record<string, unknown>
  if (call.name === 'edit') return diffLines(text(input.old_string), text(input.new_string), { context: 3 })
  if (call.name === 'write') return diffLines('', text(input.content), { context: 3 })
}

const absolute = (path: string) => path.startsWith('/') || path.startsWith('~')

const under = (path: string, cwd: string) => Boolean(cwd) && path.startsWith(`${cwd}/`)

const inside = (path: string, cwd: string) => !absolute(path) || under(path, cwd)

const shown = (path: string, cwd: string) => (under(path, cwd) ? path.slice(cwd.length + 1) : absolute(path) ? tildeHome(path) : path)

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

export const collectChanges = (entries: Entry[], { cwd, turn, failing = [], id, agent, fixedTurn }: CollectOptions): Collected => {
  const failed = failedCalls(entries, failing)
  const files = new Map<string, FileChange>()
  const turns = new Set<number>()
  const callTurns = new Map<string, number>()
  let current = fixedTurn ?? 0
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    const message = entry.data as Message
    if (fixedTurn === undefined && isPrompt(message)) current++
    if (message.role !== 'assistant') continue
    for (const block of message.content) {
      if (block.type !== 'tool_call') continue
      callTurns.set(block.id, current)
      if (failed.has(block.id)) continue
      const hunk = hunkOf(block)
      const path = text((block.input as Record<string, unknown> | undefined)?.path)
      if (!hunk || !path) continue
      turns.add(current)
      if (turn !== undefined && turn !== current) continue
      const name = shown(path, cwd)
      const key = id ? `${id}:${name}` : name
      const file = files.get(key) ?? { key, path: name, ...(agent && { agent }), outside: !inside(path, cwd), add: 0, del: 0, hunks: [], turns: new Set() }
      const { add, del } = diffCounts(hunk)
      file.hunks.push(hunk)
      file.add += add
      file.del += del
      file.turns.add(current)
      files.set(key, file)
    }
  }
  return { files: [...files.values()], turns: [...turns], callTurns, lastTurn: current }
}
