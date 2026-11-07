import type { ModelInfo } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tokens } from '@sand/util'
import { div, show, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { starButton } from '../star'
import type { Catalog } from './catalog'

export const modelRow = (kit: Kit, row: Sig<ModelInfo>, catalog: Catalog, keep: (id: string) => void) => {
  const { badge, checkMark, contextMenu, listRow, rowAction } = kit
  const label = untrack(() => row.get().label)
  const shown = () => !row.get().hidden
  const added = row.map(model => !!model.added)
  const toggle = () => {
    const model = row.get()
    keep(model.id)
    void catalog.setHidden(model, !model.hidden)
  }
  const menu = contextMenu()
  return div(
    { class: 'contents' },
    listRow({
      surface: 'group',
      role: 'checkbox',
      'aria-checked': () => String(shown()),
      'aria-label': `Show ${label} in the picker`,
      lead: checkMark(shown),
      title: () => row.get().label,
      meta: span({ class: 'font-mono' }, () => row.get().name ?? row.get().id),
      trail: [
        show(row.map(catalog.isNew), () => badge('accent', 'New')),
        show(added, () => badge('neutral', 'Added')),
        span({ class: 'tabular-nums' }, () => {
          const context = row.get().context
          return context ? tokens(context) : ''
        }),
      ],
      ...menu.target(() => catalog.menu(row.get(), keep), toggle),
      actions: [
        show(added, () => rowAction({ label: 'Remove', danger: true, run: () => void catalog.remove(row.get()) })),
        starButton(kit, label, () => row.get().favourite !== undefined, () => void catalog.setFavourite(row.get(), row.get().favourite === undefined)),
      ],
    }),
    menu.view(),
  )
}
