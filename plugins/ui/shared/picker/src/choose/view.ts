import type { Picked, PickItem, PickOptions } from '@sand/server/contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, keys, list, show, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { openSheet } from '../overlay'
import { pickModel, type PickModel } from './model'
import { row } from './row'

const results = <T>(kit: Kit, model: PickModel<T>, fine: Sig<boolean>, menu: ContextMenu) =>
  list(
    model.shown,
    index => index,
    (index, position) => row(kit, model.items[untrack(() => index.get())]!, position, model, fine, menu),
    div({ class: 'min-h-0 flex-1 overflow-auto px-2 pb-2' }),
  )

const footer = <T>({ quietButton }: Kit, { listActions, act }: PickModel<T>, options: PickOptions) => {
  const note = [options.status, options.hint].filter(Boolean).join(' · ')
  if (!note && !listActions.length) return null
  return div(
    { class: 'flex shrink-0 flex-wrap items-center gap-2 border-t border-neutral-700 px-4 py-2 text-xs text-neutral-500' },
    note && span({ class: 'min-w-0 flex-1 whitespace-pre-wrap' }, note),
    listActions.map(action => quietButton({ size: 'sm', onClick: () => act(action.id) }, action.label)),
  )
}

export const choose = <T>(kit: Kit, cancels: Set<() => void>, fine: Sig<boolean>, title: string, items: PickItem<T>[], options: PickOptions = {}) =>
  new Promise<Picked<T> | undefined>(resolve => {
    const { contextMenu, hint, searchRow } = kit
    const finish = (picked?: Picked<T>) => {
      cancels.delete(model.cancel)
      close()
      resolve(picked)
    }
    const model = pickModel(items, options, finish)
    const menu = contextMenu()
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
      results(kit, model, fine, menu),
      menu.view(),
      show(
        model.shown.map(found => !found.length),
        () => hint(items.length ? 'No matches' : (options.empty ?? 'No items yet')),
      ),
      footer(kit, model, options),
    )
  })
