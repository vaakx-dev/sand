import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, type Sig } from '@vaakx-dev/vrui'
import type { SettingsPage } from './contract'
import type { PageStore } from './pages'

export interface PageParts {
  store: PageStore
  narrow: Sig<boolean>
  showPages(): void
  choose(id: string): void
  close(): void
}

const column = 'mx-auto w-full max-w-3xl'

const backButton = ({ icon, iconButton }: Kit, parent: SettingsPage, choose: (id: string) => void) => {
  const text = `Back to ${parent.label}`
  return iconButton({ title: text, 'aria-label': text, onClick: () => choose(parent.id) }, icon('back'))
}

export const pageView = (kit: Kit, { store, narrow, showPages, choose, close }: PageParts) => {
  const { closeButton, dismissible, headTitle, paneHead, showSideButton } = kit
  const page = derive(() => store.pages.get().find(candidate => candidate.id === store.current.get()))
  const parent = derive(() => store.pages.get().find(candidate => candidate.id === page.get()?.parent))
  const sections = (above: boolean) =>
    dynamicChild(
      derive(() => store.sections.get().filter(section => section.page === page.get()?.id && (section.order ?? 0) < 0 === above)),
      shown => div({ class: 'contents' }, ...shown.map(section => section.render())),
    )
  const body = (shown: SettingsPage | undefined) =>
    div(
      { class: 'min-h-0 flex-1 overflow-auto overscroll-contain', style: kit.stableGutter },
      div({ class: [column, 'flex flex-col gap-6 px-4 pt-2 pb-12'] }, sections(true), shown?.render() ?? null, sections(false)),
    )
  return div(
    { class: 'flex h-full min-h-0 flex-1 flex-col bg-neutral-900', onMount: node => dismissible(node, close, { overlay: false }) },
    div(
      { class: 'shrink-0 overflow-hidden', style: kit.stableGutter },
      paneHead(
        { led: () => narrow.get() || Boolean(parent.get()), class: column },
        show(narrow, () => showSideButton(narrow, 'Settings pages', showPages)),
        dynamicChild(parent, found => (found ? backButton(kit, found, choose) : null)),
        headTitle(1, () => page.get()?.label ?? ''),
        show(narrow, () => closeButton({ title: 'Close settings', onClick: close })),
      ),
    ),
    dynamicChild(page, body),
  )
}
