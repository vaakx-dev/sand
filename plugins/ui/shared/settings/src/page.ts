import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, type Derive } from '@vaakx-dev/vrui'
import type { SettingsPage } from './contract'
import type { PageStore } from './pages'

export interface PageParts {
  store: PageStore
  page: Derive<SettingsPage | undefined>
  titled(): boolean
  choose(id: string): void
}

const backButton = ({ icon, iconButton }: Kit, parent: SettingsPage, choose: (id: string) => void) => {
  const text = `Back to ${parent.label}`
  return iconButton({ title: text, 'aria-label': text, class: '-ml-2', onClick: () => choose(parent.id) }, icon('back'))
}

export const pageView = (kit: Kit, { store, page, titled, choose }: PageParts) => {
  const parent = derive(() => store.pages.get().find(candidate => candidate.id === page.get()?.parent))
  const sections = (above: boolean) =>
    dynamicChild(
      derive(() => store.sections.get().filter(section => section.page === page.get()?.id && (section.order ?? 0) < 0 === above)),
      shown => div({ class: 'contents' }, ...shown.map(section => section.render())),
    )
  const body = (shown: SettingsPage | undefined) =>
    kit.pageBody(
      {
        ...(titled() && shown && { title: shown.label, intro: shown.intro }),
        lead: dynamicChild(parent, found => (found ? backButton(kit, found, choose) : null)),
      },
      sections(true),
      shown?.render?.() ?? null,
      sections(false),
    )
  return div({ class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, dynamicChild(page, body))
}
