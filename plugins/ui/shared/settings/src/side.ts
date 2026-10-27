import type { SettingsPage } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, list, show, span, type Child, type Sig } from '@vaakx-dev/vrui'
import type { PageStore } from './pages'

export interface SideParts {
  store: PageStore
  narrow: Sig<boolean>
  choose(id: string): void
  back(): void
  hide?: () => void
}

const topPages = (store: PageStore) => store.pages.map(pages => pages.filter(page => !page.parent))

const label = (text: Child) => span({ class: 'min-w-0 flex-1 truncate text-left' }, text)

const pageIcon = ({ icon }: Kit, name: string | undefined) => (name ? icon(name) : span({ class: 'h-4 w-4 shrink-0' }))

const pageButton = (kit: Kit, page: Sig<SettingsPage>, store: PageStore, choose: (id: string) => void) => {
  const active = () => {
    const current = store.current.get()
    return current === page.get().id || store.pages.get().some(other => other.id === current && other.parent === page.get().id)
  }
  return kit.navButton(
    {
      active,
      'aria-current': () => (active() ? 'page' : 'false'),
      class: 'w-full shrink-0',
      onClick: () => choose(page.get().id),
    },
    dynamicChild(
      page.map(value => value.icon),
      name => pageIcon(kit, name),
    ),
    label(page.map(value => value.label)),
    show(
      () => page.get().dot?.() ?? false,
      () => kit.dot('accent'),
    ),
  )
}

const sideHead = ({ headTitle, icon, iconButton, paneHead }: Kit, back: () => void, hide?: () => void) =>
  paneHead(
    { led: true },
    iconButton({ title: 'Close settings', 'aria-label': 'Close settings', onClick: back }, icon('back')),
    headTitle(1, 'Settings'),
    hide ? iconButton({ title: 'Show the page', 'aria-label': 'Show the page', onClick: hide }, icon('sidebar')) : null,
  )

export const sideView = (kit: Kit, { store, narrow, choose, back, hide }: SideParts) =>
  kit.sideColumn(
    { narrow, 'aria-label': 'Settings' },
    dynamicChild(narrow, drawer => sideHead(kit, back, drawer ? hide : undefined)),
    list(topPages(store), page => page.id, page => pageButton(kit, page, store, choose), div({ class: 'flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-2 pb-2' })),
  )
