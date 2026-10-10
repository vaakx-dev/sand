import { div, groupLabel, icon, list, menuItem, optionProps, prevent, show, span, type Sig } from '@sand/dom'
import type { Completion, Suggestion } from './model'

type Row = { kind: 'group'; title: string } | { kind: 'item'; item: Suggestion; index: number }

const rowsOf = (items: Suggestion[]) =>
  items.flatMap((item, index): Row[] => [
    ...(item.group && item.group !== items[index - 1]?.group ? [{ kind: 'group' as const, title: item.group }] : []),
    { kind: 'item', item, index },
  ])

const keyOf = (row: Row) => (row.kind === 'group' ? `group:${row.title}` : `${row.item.trigger ?? ''}${row.item.value}`)

const pathLabel = (value: string, partial?: boolean) => {
  const bare = value.replace(/\/$/, '')
  const cut = bare.lastIndexOf('/') + 1
  return [span({ class: 'text-neutral-500' }, bare.slice(0, cut)), bare.slice(cut), partial && span({ class: 'text-neutral-500' }, '/')]
}

const itemRow = (completion: Completion, item: Suggestion, index: Sig<number>) => {
  const isFile = item.icon === 'file' || item.icon === 'folder'
  return menuItem(
    {
      ...optionProps(completion.box, index),
      size: 'sm',
      active: () => completion.box.isSelected(index.get()),
      onMouseDown: prevent,
    },
    item.icon && span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon(item.icon, 14)),
    span(
      { class: 'min-w-0 max-w-64 shrink-0 truncate font-mono text-xs text-neutral-100' },
      isFile ? pathLabel(item.value, item.partial) : [span({ class: 'text-neutral-500' }, item.trigger ?? completion.source.get()?.trigger ?? ''), item.value],
    ),
    item.description && span({ class: 'min-w-0 truncate text-xs text-neutral-400' }, item.description),
  )
}

const rowView = (completion: Completion, row: Sig<Row>) => {
  const current = row.get()
  if (current.kind === 'group') return groupLabel(current.title)
  return itemRow(completion, current.item, row.map(value => (value.kind === 'item' ? value.index : -1)))
}

export const completionView = (completion: Completion) => [
  list(completion.items.map(rowsOf), keyOf, row => rowView(completion, row)),
  show(
    () => !completion.items.get().length && Boolean(completion.hint.get()),
    () => div({ class: 'px-3 py-2 text-xs text-neutral-500' }, () => completion.hint.get() ?? ''),
  ),
]
