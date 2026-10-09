import type { Picked, PickItem, PickOptions } from '@sand/server/contract'
import { div, keys, list, quietButton, searchInput, searchRow, show, span, untrack, type Sig } from '@sand/dom'
import { openSheet } from '../overlay'
import { pickModel, type PickModel } from './model'
import { row } from './row'

const results = <T>(model: PickModel<T>, fine: Sig<boolean>) =>
  list(
    model.shown,
    index => index,
    (index, position) => row(model.items[untrack(() => index.get())]!, position, model, fine),
    div({ class: 'min-h-0 flex-1 overflow-auto px-2 pb-2' }),
  )

const footer = <T>({ listActions, act }: PickModel<T>, options: PickOptions) => {
  const note = [options.status, options.hint].filter(Boolean).join(' · ')
  if (!note && !listActions.length) return null
  return div(
    { class: 'flex shrink-0 flex-wrap items-center gap-2 border-t border-neutral-700 px-5 py-2 text-xs text-neutral-500' },
    note && span({ class: 'min-w-0 flex-1 whitespace-pre-wrap' }, note),
    listActions.map(action => quietButton({ size: 'sm', onClick: () => act(action.id) }, action.label)),
  )
}

export const choose = <T>(cancels: Set<() => void>, fine: Sig<boolean>, title: string, items: PickItem<T>[], options: PickOptions = {}) =>
  new Promise<Picked<T> | undefined>(resolve => {
    const finish = (picked?: Picked<T>) => {
      cancels.delete(model.cancel)
      close()
      resolve(picked)
    }
    const model = pickModel(items, options, finish)
    cancels.add(model.cancel)

    const field = searchInput({
      type: 'search',
      placeholder: 'Search…',
      bindValue: model.filter,
      onMount: node => {
        if (fine.get()) node.focus()
      },
    })

    const close = openSheet(
      title,
      model.cancel,
      keys({ ...model.box.keyMap, Escape: model.cancel }, { stop: true }),
      searchRow(field),
      results(model, fine),
      show(
        model.shown.map(found => !found.length),
        () => div({ class: 'p-6 text-center text-sm text-neutral-500' }, items.length ? 'Nothing matches' : (options.empty ?? 'Nothing here')),
      ),
      footer(model, options),
    )
  })
