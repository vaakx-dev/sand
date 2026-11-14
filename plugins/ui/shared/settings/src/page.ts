import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, type Derive } from '@vaakx-dev/vrui'
import type { SettingsPage } from './contract'
import type { PageStore } from './pages'

export interface PageParts {
  store: PageStore
  page: Derive<SettingsPage | undefined>
}

export const pageView = (kit: Kit, { store, page }: PageParts) => {
  const sections = (above: boolean) =>
    dynamicChild(
      derive(() => store.sections.get().filter(section => section.page === page.get()?.id && (section.order ?? 0) < 0 === above)),
      shown => div({ class: 'contents' }, ...shown.map(section => section.render())),
    )
  const body = (shown: SettingsPage | undefined) =>
    kit.pageBody({ intro: shown?.intro }, sections(true), shown?.render?.() ?? null, sections(false))
  return div({ 'data-part': 'settings', class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, dynamicChild(page, body))
}
