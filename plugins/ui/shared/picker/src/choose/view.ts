import type { Picked, PickItem } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, keys, list, show, untrack, type Sig } from '@vaakx-dev/vrui'
import { openSheet } from '../overlay'
import { pickModel, type PickModel } from './model'
import { row } from './row'

const results = <T>(kit: Kit, model: PickModel<T>) =>
  list(
    model.shown,
    index => index,
    (index, position) => row(kit, model.items[untrack(() => index.get())]!, position, model),
    div({ class: 'min-h-0 flex-1 overflow-auto px-2 pb-2' }),
  )

export const choose = <T>(kit: Kit, cancels: Set<() => void>, fine: Sig<boolean>, title: string, items: PickItem<T>[]) =>
  new Promise<Picked<T> | undefined>(resolve => {
    const { hint, searchRow } = kit
    const finish = (picked?: Picked<T>) => {
      cancels.delete(model.cancel)
      close()
      resolve(picked)
    }
    const model = pickModel(kit, items, finish)
    cancels.add(model.cancel)

    const search = searchRow({
      placeholder: 'Search…',
      bindValue: model.filter,
      onMount: node => {
        if (fine.get()) node.focus()
      },
    })

    const close = openSheet(
      kit,
      { title, size: 'lg', close: model.cancel, keydown: keys({ ...model.box.keyMap, Escape: model.cancel }, { stop: true }) },
      search,
      results(kit, model),
      show(
        model.shown.map(found => !found.length),
        () => hint('No matches'),
      ),
    )
  })
