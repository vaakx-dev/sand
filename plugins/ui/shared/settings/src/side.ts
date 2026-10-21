import type { SettingsPage } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, list, nav, span, type Child, type Sig } from '@vaakx-dev/vrui'
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

const pageButton = ({ icon, navButton, withDot }: Kit, page: Sig<SettingsPage>, store: PageStore, choose: (id: string) => void) => {
  const active = () => {
    const current = store.current.get()
    return current === page.get().id || store.pages.get().some(other => other.id === current && other.parent === page.get().id)
  }
  return navButton(
    {
      active,
      'aria-current': () => (active() ? 'page' : 'false'),
      class: 'w-full shrink-0',
      onClick: () => choose(page.get().id),
    },
    withDot(
      dynamicChild(
        page.map(value => value.icon ?? 'right'),
        name => icon(name),
      ),
      () => page.get().dot?.() ?? false,
    ),
    label(page.map(value => value.label)),
  )
}

export const sideView = (kit: Kit, { store, narrow, choose, back, hide }: SideParts) => {
  const { icon, navButton, sideHead } = kit
  return nav(
    { 'aria-label': 'Settings', class: () => ['flex h-full min-h-0 flex-col bg-neutral-950', narrow.get() ? 'w-full' : 'w-64'] },
    dynamicChild(narrow, drawer => sideHead('Settings', drawer ? hide : undefined)),
    list(topPages(store), page => page.id, page => pageButton(kit, page, store, choose), div({ class: 'flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-2' })),
    div({ class: 'shrink-0 px-2 pt-1 pb-2' }, navButton({ class: 'w-full', onClick: back }, icon('back'), label('Back'))),
  )
}
