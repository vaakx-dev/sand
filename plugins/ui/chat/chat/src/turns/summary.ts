import type { ToolCallBlock } from '@sand/chats/contract'
import type { Item } from '@sand/transcript/contract'
import { isRecord, plural } from '@sand/util'

type Kind = 'read' | 'edit' | 'write' | 'search' | 'shell' | 'test' | 'build' | 'web' | 'helper' | 'skill' | 'page'

const kinds: Record<string, Kind> = {
  read: 'read',
  outline: 'read',
  where: 'read',
  edit: 'edit',
  patch: 'edit',
  move: 'edit',
  delete: 'edit',
  write: 'write',
  grep: 'search',
  search: 'search',
  glob: 'search',
  find: 'search',
  shell: 'shell',
  run: 'shell',
  build: 'build',
  test: 'test',
  web: 'web',
  helper: 'helper',
  helpers: 'helper',
  ask: 'helper',
  skill: 'skill',
  html: 'page',
}

const times = (count: number) => (count === 1 ? 'once' : `${count} times`)

const phrases: Record<Kind, (count: number) => string> = {
  read: count => `read ${plural(count, 'file')}`,
  edit: count => `edited ${plural(count, 'file')}`,
  write: count => `wrote ${plural(count, 'file')}`,
  search: count => `searched ${times(count)}`,
  shell: count => `ran ${plural(count, 'command')}`,
  test: () => 'ran tests',
  build: () => 'built',
  web: count => `searched the web ${times(count)}`,
  helper: count => `asked ${plural(count, 'helper')}`,
  skill: count => `used ${plural(count, 'skill')}`,
  page: count => `drew ${plural(count, 'page')}`,
}

const shown = 3

const fileKinds = new Set<Kind>(['read', 'edit', 'write'])

const commandOf = (input: unknown) => (typeof input === 'object' && input && 'command' in input && typeof input.command === 'string' ? input.command : '')

const kindOf = (call: ToolCallBlock): Kind | undefined => {
  const plain = call.name.replace(/^mcp_/, '').toLowerCase()
  const kind = kinds[plain] ?? kinds[plain.split(/[_\-.]/)[0] ?? plain]
  return kind === 'shell' && /\btest\b/.test(commandOf(call.input)) ? 'test' : kind
}

const callsIn = (work: Item[]): ToolCallBlock[] =>
  work.flatMap(item => (item.kind === 'tools' ? item.steps.flatMap(step => (step.kind === 'tool' ? [step.tool.call] : [])) : []))

const withNested = (calls: ToolCallBlock[], nested: ToolCallBlock[]) =>
  calls.flatMap(call => [call, ...nested.filter(inner => inner.id.startsWith(`${call.id}.`))])

const pathsOf = (input: unknown): string[] => {
  if (!isRecord(input)) return []
  const own = typeof input.path === 'string' ? [input.path] : []
  const changed = Array.isArray(input.edits) ? input.edits.flatMap(pathsOf) : []
  return [...own, ...changed]
}

const keysOf = (call: ToolCallBlock, kind: Kind) => {
  const paths = fileKinds.has(kind) ? pathsOf(call.input) : []
  return paths.length ? paths : [call.id]
}

export const summaryOf = (work: Item[], nested: ToolCallBlock[]) => {
  const done = new Map<Kind, Set<string>>()
  for (const call of withNested(callsIn(work), nested)) {
    const kind = kindOf(call)
    if (!kind) continue
    const keys = done.get(kind) ?? new Set()
    keysOf(call, kind).forEach(key => keys.add(key))
    done.set(kind, keys)
  }
  return [...done]
    .slice(0, shown)
    .map(([kind, keys]) => phrases[kind](keys.size))
    .join(', ')
}
