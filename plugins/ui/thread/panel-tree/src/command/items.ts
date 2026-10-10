import type { PickItem, PickTone } from '@sand/server/contract'
import { ago } from '@sand/kit'
import type { TreeNode } from '../tree/forest'
import type { TreeFrame } from '../tree/frame'
import type { Row } from '../tree/layout'

const prefixOf = (row: Row) => (row.glyph ? `${row.prefix}${row.fold ? '─' : row.glyph} ` : row.prefix)

const labelOf = ({ described, label }: TreeNode) =>
  [label && `[${label}]`, described.who, described.text && `· ${described.text}`].filter(Boolean).join(' ')

const toneOf = (here: boolean, labeled: boolean): PickTone | undefined => {
  if (here) return 'accent'
  if (labeled) return 'warning'
}

export const treeItems = (frame: TreeFrame): PickItem<string>[] =>
  frame.rows.flatMap(row => {
    const node = frame.forest.nodes.get(row.id)
    if (!node) return []
    const here = row.id === frame.here
    return [
      {
        label: labelOf(node),
        detail: here ? 'you are here' : ago(node.entry.at),
        prefix: prefixOf(row),
        search: `${node.label ?? ''} ${node.described.detail}`,
        tone: toneOf(here, Boolean(node.label)),
        value: row.id,
      },
    ]
  })
