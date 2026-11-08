import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, type Derive } from '@vaakx-dev/vrui'
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
  return iconButton({ title: text, 'aria-label': text, onClick: () => choose(parent.id) }, icon('back'))
}

export const pageView = (kit: Kit, { store, page, titled, choose }: PageParts) => {
  const { headTitle, pageColumn, stableGutter } = kit
  const parent = derive(() => store.pages.get().find(candidate => candidate.id === page.get()?.parent))
  const sections = (above: boolean) =>
    dynamicChild(
      derive(() => store.sections.get().filter(section => section.page === page.get()?.id && (section.order ?? 0) < 0 === above)),
      shown => div({ class: 'contents' }, ...shown.map(section => section.render())),
    )
  const head = () =>
    div(
      { class: 'flex min-h-12 items-center gap-2' },
      dynamicChild(parent, found => (found ? backButton(kit, found, choose) : null)),
      headTitle(1, () => page.get()?.label ?? ''),
    )
  const body = (shown: SettingsPage | undefined) =>
    div({ class: [pageColumn, 'flex flex-col gap-6 px-4 pt-2 pb-12'] }, show(titled, head), sections(true), shown?.render?.() ?? null, sections(false))
  return div({ class: 'min-h-0 flex-1 overflow-auto overscroll-contain', style: stableGutter }, dynamicChild(page, body))
}
