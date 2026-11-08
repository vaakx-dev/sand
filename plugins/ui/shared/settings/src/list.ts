import type { SettingsGroup, SettingsPage } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, keys, list, nav, show, sig, span, type Child, type ClassValue, type Sig } from '@vaakx-dev/vrui'
import { groupOf, groups, type PageStore } from './pages'

export interface ListParts {
  store: PageStore
  current(): string | undefined
  choose(id: string): void
  class: ClassValue
}

const label = (text: Child) => span({ class: 'min-w-0 flex-1 truncate text-left' }, text)

const pageIcon = ({ icon }: Kit, name: string | undefined) => (name ? icon(name) : span({ class: 'h-4 w-4 shrink-0' }))

const pageButton = (kit: Kit, page: Sig<SettingsPage>, { store, current, choose }: ListParts) => {
  const active = () => {
    const shown = current()
    return shown === page.get().id || store.pages.get().some(other => other.id === shown && other.parent === page.get().id)
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

const groupView = (kit: Kit, title: string, pages: Sig<SettingsPage[]>, parts: ListParts) =>
  show(
    () => pages.get().length > 0,
    () =>
      div(
        { class: 'flex flex-col gap-1' },
        kit.sectionHeading(title),
        list(pages, page => page.id, page => pageButton(kit, page, parts), div({ class: 'flex flex-col gap-px' })),
      ),
  )

export const listView = (kit: Kit, parts: ListParts) => {
  const { store, choose } = parts
  const query = sig('')
  const shown = derive(() => {
    const text = query.get().trim().toLowerCase()
    return store.pages.get().filter(page => !page.parent && page.label.toLowerCase().includes(text))
  })
  const inGroup = (id: SettingsGroup) => derive(() => shown.get().filter(page => groupOf(page) === id))
  return nav(
    { 'aria-label': 'Settings pages', class: ['flex min-h-0 flex-col', parts.class] },
    div(
      { class: 'flex shrink-0 px-2 py-2' },
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
      ...groups.map(group => groupView(kit, group.label, inGroup(group.id), parts)),
      show(
        () => !shown.get().length,
        () => kit.emptyState({ text: 'No settings match.' }),
      ),
    ),
  )
}
