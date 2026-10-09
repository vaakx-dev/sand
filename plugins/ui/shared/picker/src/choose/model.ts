import type { Picked, PickItem, PickOptions } from '@sand/protocol'
import { derive, effect, listbox, matching, sig, untrack } from '@sand/dom'

const searchText = (item: PickItem<unknown>) => [item.label, item.detail, item.search].filter(Boolean).join(' ')

export type PickModel<T> = ReturnType<typeof pickModel<T>>

export const pickModel = <T>(items: PickItem<T>[], options: PickOptions, finish: (picked?: Picked<T>) => void) => {
  const texts = items.map(searchText)
  const filter = sig(options.query ?? '')
  const shown = derive(() => matching(texts, filter.get(), options.rank))
  const valueAt = (position: number) => items[shown.get()[position] ?? -1]?.value
  const take = (position: number) => finish({ value: valueAt(position), query: filter.get() })
  const box = listbox({ count: () => shown.get().length, choose: take })

  effect(() => {
    filter.get()
    untrack(box.first)
  })
  box.select(Math.max(0, shown.get().indexOf(options.selected ?? 0)))

  return {
    items,
    filter,
    shown,
    box,
    tree: derive(() => !filter.get().trim()),
    rowActions: (options.actions ?? []).filter(action => action.row),
    listActions: (options.actions ?? []).filter(action => !action.row),
    act: (action: string, position = box.selected.get()) => finish({ value: valueAt(position), action, query: filter.get() }),
    cancel: () => finish(),
  }
}
