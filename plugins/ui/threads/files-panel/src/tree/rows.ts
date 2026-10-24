import type { FileChange } from '@sand/project/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { span, type Child } from '@vaakx-dev/vrui'
import type { Listing } from '../model'
import { fileName } from '../paths'
import type { Folder } from './build'
import { fileIcon } from './kinds'

export interface Rows {
  kit: Kit
  listing: Listing
  expanded: ReadonlySet<string>
  open(path: string): void
  toggle(path: string): void
}

const matchLimit = 200

const marks: Record<FileChange, { letter: string; tone: string }> = {
  added: { letter: 'A', tone: 'text-success-400' },
  modified: { letter: 'M', tone: 'text-warning-400' },
  deleted: { letter: 'D', tone: 'text-danger-400' },
}

const byName = (a: string, b: string) => a.localeCompare(b)

const indent = (depth: number) => Array.from({ length: depth }, () => span({ class: 'w-4 shrink-0' }))

const glyph = ({ icon }: Kit, name: string) => span({ class: 'flex shrink-0 text-neutral-400' }, icon(name, 14))

const label = (...children: Child[]) => span({ class: 'min-w-0 truncate' }, ...children)

const changeMark = (change: FileChange | undefined) =>
  change && span({ class: ['ml-auto shrink-0 pl-2 font-mono text-xs', marks[change].tone], title: change }, marks[change].letter)

const row = ({ kit }: Rows, onClick: () => void, ...children: Child[]) =>
  kit.rowButton({ class: 'h-8 gap-1.5 px-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100', onClick }, ...children)

const fileRow = (rows: Rows, path: string, depth: number, ...name: Child[]) =>
  row(rows, () => rows.open(path), ...indent(depth + 1), glyph(rows.kit, fileIcon(path)), label(...name), changeMark(rows.listing.changes[path]))

const folderRow = (rows: Rows, folder: Folder, depth: number, open: boolean) =>
  row(
    rows,
    () => rows.toggle(folder.path),
    ...indent(depth),
    glyph(rows.kit, open ? 'down' : 'right'),
    glyph(rows.kit, open ? 'folder-open' : 'folder'),
    label(folder.name),
    rows.listing.changedFolders.has(folder.path) && span({ class: 'ml-auto flex pl-2', title: 'Has changes' }, rows.kit.dot('warning')),
  )

export const treeRows = (rows: Rows, at: Folder, depth = 0): HTMLElement[] => [
  ...[...at.folders.values()]
    .sort((a, b) => byName(a.name, b.name))
    .flatMap(inner => {
      const open = rows.expanded.has(inner.path)
      const head = folderRow(rows, inner, depth, open)
      return open ? [head, ...treeRows(rows, inner, depth + 1)] : [head]
    }),
  ...[...at.files].sort(byName).map(path => fileRow(rows, path, depth, fileName(path))),
]

export const matchRows = (rows: Rows, query: string) => {
  const wanted = query.toLowerCase()
  const found = rows.listing.files.filter(path => path.toLowerCase().includes(wanted))
  if (!found.length) return [rows.kit.hint('No files match')]
  const shown = found.slice(0, matchLimit).map(path => {
    const name = fileName(path)
    return fileRow(rows, path, 0, name, span({ class: 'text-neutral-500' }, ` ${path.slice(0, -name.length)}`))
  })
  return found.length > matchLimit ? [...shown, rows.kit.hint(`Showing ${matchLimit} of ${found.length}. Type more to narrow it down.`)] : shown
}
