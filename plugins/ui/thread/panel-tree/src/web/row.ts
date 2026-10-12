import { exactTime } from '@sand/kit'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, effect, show, span, stopThen, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { TreeNode } from '../tree/forest'
import type { Row } from '../tree/layout'
import { rowMenu } from './menu'

export interface RowActions {
  select(id: string): void
  jump(id: string): void
  fold(id: string): void
  label(id: string): void
  fork(id: string): void
  setLabel(id: string, text: string): Promise<void>
}

export interface TreeItem {
  row: Row
  tree: TreeNode
  active: boolean
  head: boolean
  selected: boolean
}

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const glyphClass = 'flex h-5 w-4 shrink-0 items-center justify-center font-mono text-xs text-neutral-500'

const foldToggle = ({ plainButton }: Kit, row: Row, actions: RowActions) => {
  const name = row.fold === 'closed' ? 'Expand branch' : 'Collapse branch'
  return plainButton(
    { class: [glyphClass, 'hover:text-neutral-100'], title: name, 'aria-label': name, 'aria-expanded': row.fold === 'open', onClick: stopThen(() => actions.fold(row.id)) },
    row.glyph,
  )
}

const glyph = (kit: Kit, row: Row, actions: RowActions) => {
  if (row.fold) return foldToggle(kit, row, actions)
  return row.glyph && span({ class: glyphClass }, row.glyph)
}

const dotClass = (item: TreeItem) => {
  if (item.head) return 'bg-accent-400 ring-4 ring-accent-950'
  return item.tree.described.kind === 'prompt' ? 'bg-neutral-300' : 'bg-neutral-500'
}

const textClass = (item: TreeItem) => {
  return item.head || item.selected || item.active ? 'text-neutral-100' : 'text-neutral-400'
}

const details = ({ icon, iconButton, primaryAction, secondaryAction }: Kit, item: Sig<TreeItem>, actions: RowActions) => {
  const { row, tree, head } = item.get()
  return div(
    { class: 'flex min-w-0 flex-col gap-2 pt-2 pb-1' },
    tree.described.detail.replace(/\s+/g, ' ') !== tree.described.text &&
      div({ class: 'max-h-48 overflow-auto whitespace-pre-wrap wrap-anywhere text-xs text-neutral-400' }, tree.described.detail),
    div(
      { class: 'flex flex-wrap items-center gap-2' },
      !head && primaryAction({ size: 'sm', onClick: stopThen(() => actions.jump(row.id)) }, 'Go here'),
      secondaryAction({ size: 'sm', onClick: stopThen(() => actions.fork(row.id)) }, icon('fork', 14), 'Fork'),
      iconButton({ size: 'sm', title: tree.label ? 'Change label' : 'Add label', onClick: stopThen(() => actions.label(row.id)) }, icon('tag', 14)),
    ),
  )
}

const content = (kit: Kit, item: Sig<TreeItem>, actions: RowActions) => {
  const { badge } = kit
  const { row, tree, head } = item.get()
  const { described, label, entry } = tree
  return div(
    { class: 'flex min-w-0 items-start gap-2' },
    row.prefix && span({ class: 'flex h-5 shrink-0 items-center whitespace-pre font-mono text-xs text-neutral-500' }, row.prefix),
    glyph(kit, row, actions),
    span({ class: 'flex h-5 w-4 shrink-0 items-center justify-center' }, span({ class: () => ['h-2 w-2 rounded-full', dotClass(item.get())] })),
    div(
      { class: 'min-w-0 flex-1' },
      div(
        { class: 'flex min-w-0 items-center gap-2' },
        label && badge('warning', label),
        span(
          { class: () => ['min-w-0 flex-1 truncate text-sm', textClass(item.get())] },
          span({ class: 'text-neutral-500' }, described.who),
          described.text && ` · ${described.text}`,
        ),
        head ? badge('accent', 'you are here') : span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums', title: exactTime(entry.at) }, time(entry.at)),
      ),
      show(
        item.map(value => value.selected),
        () => details(kit, item, actions),
      ),
    ),
  )
}

const signature = ({ row, tree, head }: TreeItem) => [row.prefix, row.glyph, row.fold, tree.label, tree.described.text, head].join('|')

const background = (item: TreeItem) => (item.selected ? 'bg-neutral-700' : 'hover:bg-neutral-800')

const revealWhenSelected = (selected: Derive<boolean>) => (node: Element) =>
  effect(() => {
    if (selected.get()) node.scrollIntoView({ block: 'nearest' })
  })

export const rowView = (kit: Kit, item: Sig<TreeItem>, actions: RowActions, menu: ContextMenu) => {
  const selected = item.map(value => value.selected)
  return div(
    {
      role: 'option',
      'aria-selected': selected,
      class: () => ['min-w-0 cursor-pointer rounded-lg px-2 py-1.5', background(item.get())],
      ...menu.target(
        () => rowMenu(item.get(), actions),
        () => actions.select(item.get().row.id),
      ),
      onMount: revealWhenSelected(selected),
    },
    dynamicChild(item.map(signature), () => content(kit, item, actions)),
  )
}
