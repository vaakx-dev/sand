import type { Kit } from '@sand/ui-kit/contract'
import { span, type Child } from '@vaakx-dev/vrui'
import type { Changes } from '../changes'
import type { Listing } from '../model'
import { fileName } from '../paths'
import type { Folder } from './build'
import { fileIcon } from './kinds'

export interface Rows {
  kit: Kit
  listing: Listing
  changes: Changes
  expanded: ReadonlySet<string>
  open(path: string): void
  toggle(path: string): void
}

const matchLimit = 200

const byName = (a: string, b: string) => a.localeCompare(b)

const slot = (...children: Child[]) => span({ class: 'flex w-4 shrink-0 justify-center' }, ...children)

const lead = (depth: number, ...children: Child[]) =>
  span({ class: 'flex items-center gap-1' }, ...Array.from({ length: depth }, () => slot()), ...children)

const fileRow = ({ kit, changes, open }: Rows, path: string, depth: number, meta?: string) => {
  const kind = changes.files.get(path)
  return kit.listRow({
    title: fileName(path),
    meta,
    lead: lead(depth + 1, kit.icon(fileIcon(path), 16)),
    trail: kind && kit.fileKindMark(kind),
    onClick: () => open(path),
  })
}

const folderRow = ({ kit, changes, toggle }: Rows, folder: Folder, depth: number, open: boolean) =>
  kit.listRow({
    title: folder.name,
    expanded: open,
    lead: lead(depth, slot(kit.icon(open ? 'down' : 'right', 14)), kit.icon(open ? 'folder-open' : 'folder', 16)),
    trail: changes.folders.has(folder.path) ? span({ class: 'flex', title: 'Has changes' }, kit.dot('neutral')) : null,
    onClick: () => toggle(folder.path),
  })

export const treeRows = (rows: Rows, at: Folder, depth = 0): HTMLElement[] => [
  ...[...at.folders.values()]
    .sort((a, b) => byName(a.name, b.name))
    .flatMap(inner => {
      const open = rows.expanded.has(inner.path)
      const head = folderRow(rows, inner, depth, open)
      return open ? [head, ...treeRows(rows, inner, depth + 1)] : [head]
    }),
  ...[...at.files].sort(byName).map(path => fileRow(rows, path, depth)),
]

export const matchRows = (rows: Rows, query: string) => {
  const { emptyState } = rows.kit
  const wanted = query.toLowerCase()
  const found = rows.listing.files.filter(path => path.toLowerCase().includes(wanted))
  if (!found.length) return [emptyState({ text: 'No files match.' })]
  const shown = found.slice(0, matchLimit).map(path => fileRow(rows, path, -1, path.slice(0, -fileName(path).length) || undefined))
  return found.length > matchLimit ? [...shown, emptyState({ text: `Showing ${matchLimit} of ${found.length}. Type more to narrow it down.` })] : shown
}
