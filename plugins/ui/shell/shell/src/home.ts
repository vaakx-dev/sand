import { div, h1, list } from '@vaakx-dev/vrui'
import type { Model } from './model'
import { brandLook, footRow, groupList, navList } from './rows'

export const homeScreen = (model: Model) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div(
      { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pt-2' },
      h1({ class: [brandLook, 'text-lg'] }, 'sand'),
      navList(model, true),
      groupList(model, menu, { phone: true }),
      div({ class: 'mt-auto pb-2' }, footRow(model, true)),
    ),
    list(
      model.places.home.items,
      placed => placed.view,
      placed => placed.get().view,
      div({ class: 'flex shrink-0 flex-col' }),
    ),
    menu.view(),
  )
}
