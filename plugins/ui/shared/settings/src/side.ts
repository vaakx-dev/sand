import type { SettingsGroup, SettingsPage } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, keys, list, show, sig, span, type Child, type Sig } from '@vaakx-dev/vrui'
import { groupOf, groups, type PageStore } from './pages'

export interface SideParts {
  store: PageStore
  narrow: Sig<boolean>
  choose(id: string): void
  back(): void
  hide?: () => void
}

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
    headTitle(2, 'Settings'),
    hide ? iconButton({ title: 'Show the page', 'aria-label': 'Show the page', onClick: hide }, icon('sidebar')) : null,
  )

const groupView = (kit: Kit, title: string, pages: Sig<SettingsPage[]>, store: PageStore, choose: (id: string) => void) =>
  show(
    () => pages.get().length > 0,
    () =>
      div(
        { class: 'flex flex-col gap-1' },
        kit.sectionHeading(title),
        list(pages, page => page.id, page => pageButton(kit, page, store, choose), div({ class: 'flex flex-col gap-1' })),
      ),
  )

export const sideView = (kit: Kit, { store, narrow, choose, back, hide }: SideParts) => {
  const query = sig('')
  const shown = derive(() => {
    const text = query.get().trim().toLowerCase()
    return store.pages.get().filter(page => !page.parent && page.label.toLowerCase().includes(text))
  })
  const inGroup = (id: SettingsGroup) => derive(() => shown.get().filter(page => groupOf(page) === id))
  return kit.sideColumn(
    { narrow, 'aria-label': 'Settings' },
    dynamicChild(narrow, drawer => sideHead(kit, back, drawer ? hide : undefined)),
    div(
      { class: 'flex px-2 pb-2' },
      kit.searchField({
        placeholder: 'Search settings',
        'aria-label': 'Search settings',
        bindValue: query,
        onKeyDown: keys({
          Escape: () => query.set(''),
          Enter: () => {
            const first = shown.get()[0]
            if (first) choose(first.id)
          },
        }),
      }),
    ),
    div(
      { class: 'flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-2 pb-2' },
      ...groups.map(group => groupView(kit, group.label, inGroup(group.id), store, choose)),
      show(
        () => !shown.get().length,
        () => kit.emptyState({ text: 'No settings match.' }),
      ),
    ),
  )
}
