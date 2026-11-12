import type { SettingsGroup, SettingsPage } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, keys, list, nav, show, sig, span, type Child, type Sig } from '@vaakx-dev/vrui'
import { groupOf, groups, type PageStore } from './pages'

export interface ListParts {
  store: PageStore
  current(): string | undefined
  choose(id: string): void
  phone: boolean
}

const label = (text: Child) => span({ class: 'min-w-0 flex-1 truncate text-left' }, text)

const pageButton = (kit: Kit, page: Sig<SettingsPage>, { store, current, choose, phone }: ListParts) => {
  const active = () => {
    const shown = current()
    return shown === page.get().id || store.pages.get().some(other => other.id === shown && other.parent === page.get().id)
  }
  return kit.navButton(
    {
      active,
      'aria-current': () => (active() ? 'page' : 'false'),
      size: phone ? 'lg' : 'md',
      class: 'w-full shrink-0',
      onClick: () => choose(page.get().id),
    },
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
        { class: 'flex flex-col' },
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
    { 'aria-label': 'Settings pages', class: ['flex min-h-0 flex-1 flex-col', parts.phone && 'px-2'] },
    div(
      { class: 'flex shrink-0 py-2' },
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
      { class: 'flex min-h-0 flex-1 flex-col overflow-auto pb-2' },
      ...groups.map(group => groupView(kit, group.label, inGroup(group.id), parts)),
      show(
        () => !shown.get().length,
        () => div({ class: 'px-2' }, kit.emptyState({ text: 'Nothing matches.' })),
      ),
    ),
  )
}
