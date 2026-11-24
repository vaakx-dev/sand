import type { SettingsGroup, SettingsPage } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, keys, list, nav, show, sig, span, type Child, type Derive, type Sig } from '@vaakx-dev/vrui'
import { groupOf, groups, type Found, type PageStore } from './pages'

export interface ListParts {
  store: PageStore
  current(): string | undefined
  choose(id: string, item?: string): void
  phone: boolean
}

export const listLabel = 'Settings pages'

const label = (text: Child) => span({ class: 'min-w-0 flex-1 truncate text-left' }, text)

const iconLook = 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100 group-aria-current:text-neutral-100'

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
      class: 'group w-full shrink-0',
      onClick: () => choose(page.get().id),
    },
    span({ class: iconLook }, kit.icon(page.get().icon ?? 'gear')),
    label(page.map(value => value.label)),
    show(
      () => page.get().dot?.() ?? false,
      () => kit.dot('accent'),
    ),
  )
}

const groupView = (kit: Kit, title: string | undefined, pages: Sig<SettingsPage[]>, parts: ListParts) =>
  show(
    () => pages.get().length > 0,
    () =>
      div(
        { class: 'flex flex-col' },
        title ? kit.sectionHeading(title) : null,
        list(pages, page => page.id, page => pageButton(kit, page, parts), div({ class: 'flex flex-col gap-px' })),
      ),
  )

const groupedView = (kit: Kit, parts: ListParts) => {
  const top = derive(() => parts.store.pages.get().filter(page => !page.parent))
  const inGroup = (id: SettingsGroup) => derive(() => top.get().filter(page => groupOf(page) === id))
  return div({ class: 'flex flex-col' }, ...groups.map(group => groupView(kit, group.label, inGroup(group.id), parts)))
}

const resultButton = (kit: Kit, found: Sig<Found>, { choose, phone }: ListParts) =>
  kit.navButton(
    {
      size: phone ? 'lg' : 'md',
      class: 'group h-auto w-full shrink-0 py-1.5',
      onClick: () => choose(found.get().page.id, found.get().item),
    },
    span({ class: iconLook }, kit.icon(found.get().page.icon ?? 'gear')),
    div(
      { class: 'flex min-w-0 flex-1 flex-col text-left' },
      span({ class: 'min-w-0 truncate' }, found.map(value => value.label)),
      show(
        () => Boolean(found.get().place),
        () => kit.metaLine(found.map(value => value.place ?? '')),
      ),
    ),
  )

const resultsView = (kit: Kit, results: Derive<Found[]>, parts: ListParts) =>
  div(
    { class: 'flex flex-col pt-2' },
    list(results, found => found.key, found => resultButton(kit, found, parts), div({ class: 'flex flex-col gap-px' })),
    show(
      () => !results.get().length,
      () => div({ class: 'px-2' }, kit.emptyState({ text: 'Nothing matches.' })),
    ),
  )

export const listView = (kit: Kit, parts: ListParts) => {
  const { store, choose } = parts
  const query = sig('')
  const searching = derive(() => query.get().trim().length > 0)
  const found = derive(() => (searching.get() ? store.search(query.get()) : []))
  const open = (entry: Found | undefined) => entry && choose(entry.page.id, entry.item)
  return nav(
    { 'aria-label': listLabel, class: ['flex min-h-0 flex-1 flex-col', parts.phone && 'px-2'] },
    div(
      { class: 'flex shrink-0 py-2' },
      kit.searchField({
        placeholder: 'Search settings',
        'aria-label': 'Search settings',
        bindValue: query,
        onKeyDown: keys({
          Escape: () => query.set(''),
          Enter: () => open(found.get()[0]),
        }),
      }),
    ),
    div(
      { class: 'flex min-h-0 flex-1 flex-col overflow-auto pb-2' },
      dynamicChild(searching, shown => (shown ? resultsView(kit, found, parts) : groupedView(kit, parts))),
    ),
  )
}
