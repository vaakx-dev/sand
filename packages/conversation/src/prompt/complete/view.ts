import type { Suggestion } from '@sand/protocol'
import { derive, div, groupLabel, icon, list, menuItem, optionProps, prevent, show, span, type Sig } from '@sand/dom'
import type { CompletionModel } from './model'

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

const itemRow = (model: CompletionModel, row: Extract<Row, { kind: 'item' }>, index: Sig<number>) => {
  const { item } = row
  const isFile = item.icon === 'file' || item.icon === 'folder'
  return menuItem(
    {
      ...optionProps(model.box, index),
      size: 'sm',
      active: () => model.box.isSelected(index.get()),
      onMouseDown: prevent,
    },
    item.icon && span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon(item.icon, 14)),
    span(
      { class: 'min-w-0 max-w-64 shrink-0 truncate font-mono text-xs text-neutral-100' },
      isFile ? pathLabel(item.value, item.partial) : [span({ class: 'text-neutral-500' }, item.trigger ?? model.source.get()?.trigger ?? ''), item.value],
    ),
    item.description && span({ class: 'min-w-0 truncate text-xs text-neutral-400' }, item.description),
  )
}

const rowView = (model: CompletionModel, row: Sig<Row>) => {
  const current = row.get()
  if (current.kind === 'group') return groupLabel(current.title)
  return itemRow(model, current, row.map(value => (value.kind === 'item' ? value.index : -1)))
}

export const completionView = (model: CompletionModel) => [
  list(model.items.map(rowsOf), keyOf, row => rowView(model, row)),
  show(
    derive(() => !model.items.get().length && Boolean(model.hint.get())),
    () => div({ class: 'px-3 py-2 text-xs text-neutral-500' }, () => model.hint.get() ?? ''),
  ),
]

export const completionKeys = (model: CompletionModel, event: KeyboardEvent) => {
  const handler = model.keyMap[event.key]
  if (!handler || !model.visible.get()) return false
  if (event.key !== 'Escape' && !model.items.get().length) return false
  handler(event)
  return true
}
