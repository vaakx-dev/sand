import type { ModelInfo } from '@sand/llm-accounts/contract'
import { badge, contextMenu, div, icon, rowAction, rowButton, show, span, untrack, type Sig } from '@sand/dom'
import { tokens } from '@sand/kit'
import { starButton } from '../star'
import type { Catalog } from './catalog'

const checkMark = (on: () => boolean) =>
  span(
    {
      class: [
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md transition-colors',
        () => (on() ? 'bg-accent-500 text-white' : 'text-transparent ring-1 ring-neutral-600'),
      ],
    },
    icon('check', 12),
  )

export const modelRow = (row: Sig<ModelInfo>, catalog: Catalog, keep: (id: string) => void) => {
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
    { class: 'flex items-center gap-1 bg-neutral-900 pr-3' },
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
          span({ class: 'truncate text-sm text-neutral-100' }, () => row.get().label),
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
    starButton(label, () => row.get().favourite !== undefined, () => void catalog.setFavourite(row.get(), row.get().favourite === undefined)),
    menu.view(),
  )
}
