import type { ModelInfo } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tokens } from '@sand/util'
import { div, show, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { starButton } from '../star'
import type { Catalog } from './catalog'

export const modelRow = (kit: Kit, row: Sig<ModelInfo>, catalog: Catalog, keep: (id: string) => void) => {
  const { badge, checkMark, contextMenu, rowAction, rowButton } = kit
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
    { class: 'flex items-center gap-3 bg-neutral-900 pr-4' },
    rowButton(
      {
        role: 'checkbox',
        'aria-checked': () => String(shown()),
        'aria-label': `Show ${label} in the picker`,
        class: 'min-h-12 flex-1 gap-3 py-2 pl-4',
        ...menu.target(() => catalog.menu(row.get(), keep), toggle),
      },
      checkMark(shown),
      div(
        { class: 'flex min-w-0 flex-1 flex-col' },
        span(
          { class: 'flex min-w-0 items-center gap-2' },
          span({ class: 'truncate text-sm font-medium text-neutral-100' }, () => row.get().label),
          show(row.map(catalog.isNew), () => badge('accent', 'New')),
          show(added, () => badge('neutral', 'Added')),
        ),
        span({ class: 'truncate font-mono text-xs text-neutral-500' }, () => row.get().name ?? row.get().id),
      ),
      span({ class: 'shrink-0 font-mono text-xs text-neutral-500' }, () => {
        const context = row.get().context
        return context ? tokens(context) : ''
      }),
    ),
    show(added, () => rowAction({ label: 'Remove', danger: true, run: () => void catalog.remove(row.get()) })),
    starButton(kit, label, () => row.get().favourite !== undefined, () => void catalog.setFavourite(row.get(), row.get().favourite === undefined)),
    menu.view(),
  )
}
