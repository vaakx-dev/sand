import type { Entry } from '@sand/messages'
import { collectChanges, type Changes } from './collect'

export interface Source {
  id: string
  cwd: string
  entries: Entry[]
  failing?: Iterable<string>
  label?: string
  origin?: string | null
  children: Source[]
}

export interface TreeOptions {
  turn?: number
  diffs?: boolean
}

const gather = (source: Source, options: TreeOptions, fixedTurn: number | undefined, root: boolean): Changes => {
  const own = collectChanges(source.entries, {
    ...options,
    cwd: source.cwd,
    failing: source.failing,
    fixedTurn,
    ...(!root && { id: source.id, agent: source.label ?? 'agent' }),
  })
  const files = [...own.files]
  const turns = new Set(own.turns)
  for (const child of source.children) {
    const at = fixedTurn ?? (child.origin ? own.callTurns.get(child.origin) : undefined) ?? own.lastTurn
    const nested = gather(child, options, at, false)
    files.push(...nested.files)
    for (const value of nested.turns) turns.add(value)
  }
  return { files, turns: [...turns].sort((a, b) => a - b) }
}

export const collectTree = (source: Source, options: TreeOptions = {}): Changes => gather(source, options, undefined, true)
