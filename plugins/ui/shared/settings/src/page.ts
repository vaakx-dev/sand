import { appIcon, derive, div, dismissible, dynamicChild, headTitle, icon, iconButton, paneHead, show, type Sig } from '@sand/dom'
import type { SettingsPage } from './contract'
import type { PageStore } from './pages'

export interface PageParts {
  store: PageStore
  narrow: Sig<boolean>
  showPages(): void
  close(): void
}

export const pageView = ({ store, narrow, showPages, close }: PageParts) => {
  const page = derive(() => store.pages.get().find(candidate => candidate.id === store.current.get()))
  const sections = (above: boolean) =>
    dynamicChild(
      derive(() => store.sections.get().filter(section => section.page === page.get()?.id && (section.order ?? 0) < 0 === above)),
      shown => div({ class: 'contents' }, ...shown.map(section => section.render())),
    )
  const body = (shown: SettingsPage | undefined) =>
    div(
      { class: 'min-h-0 flex-1 overflow-auto overscroll-contain' },
      div({ class: 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-2 pb-12' }, sections(true), shown?.render() ?? null, sections(false)),
    )
  return div(
    { class: 'flex h-full min-h-0 flex-1 flex-col bg-neutral-900', onMount: node => dismissible(node, close, { overlay: false }) },
    paneHead(
      show(narrow, () => iconButton({ title: 'Settings', 'aria-label': 'Settings', onClick: showPages }, appIcon(20))),
      headTitle(1, () => page.get()?.label ?? ''),
      show(narrow, () => iconButton({ title: 'Close settings', 'aria-label': 'Close settings', onClick: close }, icon('x'))),
    ),
    dynamicChild(page, body),
  )
}
