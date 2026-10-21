import type { Picked, PickItem } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { matching } from '@sand/util'
import { derive, effect, sig, untrack } from '@vaakx-dev/vrui'

const searchText = (item: PickItem<unknown>) => [item.label, item.detail].filter(Boolean).join(' ')

export type PickModel<T> = ReturnType<typeof pickModel<T>>

export const pickModel = <T>({ listbox }: Kit, items: PickItem<T>[], finish: (picked?: Picked<T>) => void) => {
  const texts = items.map(searchText)
  const filter = sig('')
  const shown = derive(() => matching(texts, filter.get()))
  const take = (position: number) => {
    const item = items[shown.get()[position] ?? -1]
    finish(item && { value: item.value })
  }
  const box = listbox({ count: () => shown.get().length, choose: take })

  effect(() => {
    filter.get()
    untrack(box.first)
  })

  return {
    items,
    filter,
    shown,
    box,
    cancel: () => finish(),
  }
}
