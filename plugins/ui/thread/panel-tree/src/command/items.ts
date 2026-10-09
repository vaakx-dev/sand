import type { PickItem } from '@sand/protocol'
import { ago } from '@sand/kit'
import { ancestors, type TreeNode } from '../tree/forest'
import type { TreeFrame } from '../tree/frame'
import type { Row } from '../tree/layout'

const prefixOf = (row: Row) => (row.glyph ? `${row.prefix}${row.fold ? '─' : row.glyph} ` : row.prefix)

const labelOf = ({ described, label }: TreeNode) =>
  [label && `[${label.text}]`, described.who, described.text && `· ${described.text}`].filter(Boolean).join(' ')

export const treeItems = (frame: TreeFrame, head: string | null): PickItem<string>[] => {
  const { nodes, parent } = frame.forest
  const current = ancestors(nodes, head).find(id => parent.has(id))
  return frame.rows.flatMap(row => {
    const node = nodes.get(row.id)
    if (!node) return []
    const here = row.id === current
    return [
      {
        label: labelOf(node),
        detail: here ? 'you are here' : ago(node.entry.at),
        prefix: prefixOf(row),
        search: `${node.label?.text ?? ''} ${node.described.detail}`,
        ...((here || node.label) && { tone: here ? ('accent' as const) : ('warning' as const) }),
        value: row.id,
      },
    ]
  })
}
