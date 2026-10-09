import type { Forest } from './forest'

export interface Row {
  id: string
  prefix: string
  glyph: string
  fold?: 'open' | 'closed'
}

interface Gutter {
  position: number
  show: boolean
}

interface Frame {
  id: string
  indent: number
  branched: boolean
  last: boolean
  gutters: Gutter[]
  virtual: boolean
}

const foldable = (forest: Forest, id: string) => {
  if (!forest.children.get(id)?.length) return false
  const parent = forest.parent.get(id)
  return parent == null || (forest.children.get(parent)?.length ?? 0) > 1
}

const indentation = (gutters: Gutter[], display: number, connector: string) => {
  let text = ''
  for (let level = 0; level < display; level++) {
    const gutter = gutters.find(candidate => candidate.position === level)
    if (gutter) text += gutter.show ? '│  ' : '   '
    else if (connector && level === display - 1) text += connector
    else text += '   '
  }
  return text
}

export const layout = (forest: Forest, folded: Set<string>): Row[] => {
  const roots = forest.children.get(null) ?? []
  const many = roots.length > 1
  const rows: Row[] = []
  const stack: Frame[] = roots
    .map((id, index) => ({ id, indent: many ? 1 : 0, branched: many, last: index === roots.length - 1, gutters: [], virtual: many }))
    .reverse()
  for (let frame = stack.pop(); frame; frame = stack.pop()) {
    const display = Math.max(0, many ? frame.indent - 1 : frame.indent)
    const closed = folded.has(frame.id)
    const connected = frame.branched && !frame.virtual
    const fold = closed ? 'closed' : foldable(forest, frame.id) ? 'open' : undefined
    const glyph = closed ? '⊞' : fold ? '⊟' : connected ? '─' : ''
    const connector = connected ? `${frame.last ? '└' : '├'}${glyph} ` : ''
    const prefix = indentation(frame.gutters, display, connector)
    const placed = connected && prefix.endsWith(connector)
    rows.push({
      id: frame.id,
      prefix: placed ? prefix.slice(0, -2) : prefix,
      glyph: placed || closed ? glyph : '',
      ...(fold && { fold }),
    })
    if (closed) continue
    const children = forest.children.get(frame.id) ?? []
    const branching = children.length > 1
    const indent = branching || (frame.branched && frame.indent > 0) ? frame.indent + 1 : frame.indent
    const gutters = connected ? [...frame.gutters, { position: Math.max(0, display - 1), show: !frame.last }] : frame.gutters
    for (let index = children.length - 1; index >= 0; index--) {
      const id = children[index]
      if (id) stack.push({ id, indent, branched: branching, last: index === children.length - 1, gutters, virtual: false })
    }
  }
  return rows
}

export const rowIndex = (rows: Row[], lineage: string[]) => {
  const position = new Map(rows.map((row, index) => [row.id, index]))
  for (const id of lineage) {
    const found = position.get(id)
    if (found !== undefined) return found
  }
  return rows.length - 1
}
