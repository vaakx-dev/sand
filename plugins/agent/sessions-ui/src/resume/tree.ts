import type { SessionSummary } from '@sand/sessions-sqlite/contract'

export interface Threaded {
  session: SessionSummary
  prefix: string
}

interface Node {
  session: SessionSummary
  children: Node[]
  latest: number
}

const latest = (node: Node): number => (node.latest = Math.max(node.session.updated, ...node.children.map(latest)))

const order = (nodes: Node[]) => {
  nodes.sort((a, b) => b.latest - a.latest)
  for (const node of nodes) order(node.children)
}

export const thread = (sessions: SessionSummary[]) => {
  const nodes = new Map(sessions.map(session => [session.id, { session, children: [], latest: session.updated } as Node]))
  const roots: Node[] = []
  for (const node of nodes.values()) {
    const parent = node.session.parent ? nodes.get(node.session.parent) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  roots.forEach(latest)
  order(roots)
  const rows: Threaded[] = []
  const walk = (node: Node, lines: string, depth: number, last: boolean) => {
    rows.push({ session: node.session, prefix: depth ? `${lines}${last ? '└─ ' : '├─ '}` : '' })
    const below = depth ? `${lines}${last ? '   ' : '│  '}` : '   '
    node.children.forEach((child, index) => walk(child, below, depth + 1, index === node.children.length - 1))
  }
  for (const root of roots) walk(root, '', 0, true)
  return rows
}
