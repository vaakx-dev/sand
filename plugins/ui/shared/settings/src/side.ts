import type { SettingsPage } from '@sand/protocol'
import { appIcon, div, dynamicChild, el, icon, list, navButton, span, type Child, type Sig } from '@sand/dom'
import type { PageStore } from './pages'

export interface SideParts {
  store: PageStore
  narrow: Sig<boolean>
  choose(id: string): void
  back(): void
}

const label = (text: Child) => span({ class: 'min-w-0 flex-1 truncate text-left' }, text)

const pageButton = (page: Sig<SettingsPage>, store: PageStore, choose: (id: string) => void) => {
  const active = () => store.current.get() === page.get().id
  return navButton(
    {
      active,
      'aria-current': () => (active() ? 'page' : 'false'),
      class: 'w-full shrink-0',
      onClick: () => choose(page.get().id),
    },
    dynamicChild(
      page.map(value => value.icon ?? 'right'),
      name => icon(name),
    ),
    label(page.map(value => value.label)),
  )
}

export const sideView = ({ store, narrow, choose, back }: SideParts) =>
  el(
    'nav',
    { 'aria-label': 'Settings', class: () => ['flex h-full min-h-0 flex-col bg-neutral-950', narrow.get() ? 'w-full' : 'w-64'] },
    div(
      { class: 'flex h-12 shrink-0 items-center px-2' },
      span({ class: 'flex h-8 w-8 items-center justify-center' }, appIcon(20)),
      el('b', { class: 'text-middle text-sm font-semibold text-neutral-300' }, 'Settings'),
    ),
    list(store.pages, page => page.id, page => pageButton(page, store, choose), div({ class: 'flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-2' })),
    div({ class: 'shrink-0 px-2 pt-1 pb-2' }, navButton({ class: 'w-full', onClick: back }, icon('back'), label('Back'))),
  )
