import type { Entry } from '@sand/messages'
import { toolCalls } from '@sand/kit'
import { describe, type DescribeTool, type Described } from './describe'
import { passes, type Filter } from './filter'
import { labelsOf, type Label } from './labels'

export interface TreeNode {
  entry: Entry
  described: Described
  label?: Label
}

export interface Forest {
  nodes: Map<string, TreeNode>
  parent: Map<string, string | null>
  children: Map<string | null, string[]>
  active: Set<string>
}

export const nodesOf = (entries: Entry[], tool: DescribeTool) => {
  const calls = toolCalls(entries)
  const labels = labelsOf(entries)
  return new Map(
    entries.map((entry): [string, TreeNode] => [entry.id, { entry, described: describe(entry, calls, tool), label: labels.get(entry.id) }]),
  )
}

export const ancestors = (nodes: Map<string, TreeNode>, id: string | null) => {
  const found: string[] = []
  for (let current = id; current && nodes.has(current); current = nodes.get(current)?.entry.parent ?? null) found.push(current)
  return found
}

export const growForest = (nodes: Map<string, TreeNode>, head: string | null, filter: Filter, search: string): Forest => {
  const active = new Set(ancestors(nodes, head))
  const tokens = search.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = ({ entry, described, label }: TreeNode) => {
    if (described.kind === 'step' && entry.id !== head) return false
    if (!passes(filter, described, Boolean(label))) return false
    const text = [label?.text, described.who, described.detail].join(' ').toLowerCase()
    return tokens.every(token => text.includes(token))
  }
  const visible = new Set([...nodes.values()].filter(shown).map(node => node.entry.id))
  const nearest = new Map<string, string | null>()
  const above = (id: string | null): string | null => {
    if (!id || !nodes.has(id)) return null
    if (visible.has(id)) return id
    if (!nearest.has(id)) nearest.set(id, above(nodes.get(id)?.entry.parent ?? null))
    return nearest.get(id) ?? null
  }
  const parent = new Map<string, string | null>()
  const children = new Map<string | null, string[]>([[null, []]])
  for (const id of visible) {
    const up = above(nodes.get(id)?.entry.parent ?? null)
    parent.set(id, up)
    children.set(up, [...(children.get(up) ?? []), id])
  }
  for (const [id, list] of children) children.set(id, list.toSorted((a, b) => Number(active.has(b)) - Number(active.has(a))))
  return { nodes, parent, children, active }
}
