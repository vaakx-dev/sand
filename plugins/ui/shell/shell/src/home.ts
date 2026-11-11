import { div, list } from '@vaakx-dev/vrui'
import type { Model } from './model'
import { brand, footRow, groupList, navList, quietNavList } from './rows'

export const homeScreen = (model: Model) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: 'flex min-h-0 flex-1 flex-col bg-neutral-950' },
    div(
      { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pt-2 pb-2' },
      brand(model, true),
      navList(model, true),
      groupList(model, menu, { phone: true }),
      list(
        model.places.home.items,
        entry => entry.view,
        entry => entry.get().view,
        div({ class: 'flex flex-col' }),
      ),
    ),
    div({ class: 'shrink-0 px-2 pb-1' }, quietNavList(model, true)),
    div({ class: 'shrink-0 px-2 pb-2' }, footRow(model, true)),
    menu.view(),
  )
}
