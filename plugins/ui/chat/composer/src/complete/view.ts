import type { Kit } from '@sand/ui-kit/contract'
import { list, prevent, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Completion, Suggestion } from './model'

type Row = { kind: 'group'; title: string } | { kind: 'item'; item: Suggestion; index: number }

const rowsOf = (items: Suggestion[]) =>
  items.flatMap((item, index): Row[] => [
    ...(item.group && item.group !== items[index - 1]?.group ? [{ kind: 'group' as const, title: item.group }] : []),
    { kind: 'item', item, index },
  ])

const keyOf = (row: Row) => (row.kind === 'group' ? `group:${row.title}` : row.item.value)

const pathLabel = (value: string, partial?: boolean) => {
  const bare = value.replace(/\/$/, '')
  const cut = bare.lastIndexOf('/') + 1
  return [span({ class: 'text-neutral-500' }, bare.slice(0, cut)), bare.slice(cut), partial && span({ class: 'text-neutral-500' }, '/')]
}

const itemRow = (kit: Kit, completion: Completion, item: Suggestion, index: Sig<number>) => {
  const { menuItem, optionProps } = kit
  const isFile = item.icon === 'file' || item.icon === 'folder'
  return menuItem(
    {
      ...optionProps(completion.box, index),
      size: 'sm',
      icon: item.icon,
      active: () => completion.box.isSelected(index.get()),
      onMouseDown: prevent,
    },
    span(
      { class: 'min-w-0 max-w-64 shrink-0 truncate font-mono text-xs text-neutral-100' },
      isFile ? pathLabel(item.value, item.partial) : [span({ class: 'text-neutral-500' }, completion.source.get()?.trigger ?? ''), item.value],
    ),
    item.description && span({ class: 'min-w-0 truncate text-xs text-neutral-400' }, item.description),
  )
}

const rowView = (kit: Kit, completion: Completion, row: Sig<Row>) => {
  const { groupLabel } = kit
  const current = row.get()
  if (current.kind === 'group') return groupLabel(current.title)
  return itemRow(kit, completion, current.item, row.map(value => (value.kind === 'item' ? value.index : -1)))
}

export const completionView = (kit: Kit, completion: Completion) => {
  const { hint } = kit
  return [
    list(completion.items.map(rowsOf), keyOf, row => rowView(kit, completion, row)),
    show(
      () => !completion.items.get().length && Boolean(completion.hint.get()),
      () => hint(() => completion.hint.get() ?? ''),
    ),
  ]
}
