import type { Kit } from '@sand/ui-kit/contract'
import { list, prevent, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Suggestion } from './merge'
import type { Completion } from './model'

type Row = { kind: 'group'; title: string } | { kind: 'item'; suggestion: Suggestion; index: number }

const rowsOf = (suggestions: Suggestion[]) =>
  suggestions.flatMap((suggestion, index): Row[] => [
    ...(suggestion.group !== suggestions[index - 1]?.group ? [{ kind: 'group' as const, title: suggestion.group }] : []),
    { kind: 'item', suggestion, index },
  ])

const keyOf = (row: Row) => (row.kind === 'group' ? `group:${row.title}` : `${row.suggestion.group}:${row.index}:${row.suggestion.item.label}`)

const pathLabel = (value: string, partial?: boolean) => {
  const bare = value.replace(/\/$/, '')
  const cut = bare.lastIndexOf('/') + 1
  return [span({ class: 'text-neutral-500' }, bare.slice(0, cut)), bare.slice(cut), partial && span({ class: 'text-neutral-500' }, '/')]
}

const itemRow = (kit: Kit, completion: Completion, { trigger, item }: Suggestion, index: Sig<number>) => {
  const { menuItem, metaLine, optionProps } = kit
  return menuItem(
    {
      ...optionProps(completion.box, index),
      size: 'sm',
      ...(item.icon && { icon: item.icon }),
      active: () => completion.box.isSelected(index.get()),
      onMouseDown: prevent,
    },
    span(
      { class: 'min-w-0 max-w-64 shrink-0 truncate' },
      item.path ? pathLabel(item.label, item.partial) : [!item.icon && span({ class: 'text-neutral-500' }, trigger.char), item.label],
    ),
    item.description && metaLine(item.description),
  )
}

const rowView = (kit: Kit, completion: Completion, row: Sig<Row>) => {
  const { sectionHeading } = kit
  const current = row.get()
  if (current.kind === 'group') return sectionHeading(current.title)
  return itemRow(kit, completion, current.suggestion, row.map(value => (value.kind === 'item' ? value.index : -1)))
}

export const completionView = (kit: Kit, completion: Completion) => {
  const { emptyState } = kit
  return [
    list(completion.items.map(rowsOf), keyOf, row => rowView(kit, completion, row)),
    show(
      () => !completion.items.get().length && Boolean(completion.hint.get()),
      () => emptyState({ surface: 'raised', text: () => completion.hint.get() ?? '' }),
    ),
  ]
}
