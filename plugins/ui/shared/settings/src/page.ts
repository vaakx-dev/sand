import { derive, div, dismissible, dynamicChild, el, icon, iconButton, show, type Sig } from '@sand/dom'
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
  const scroller: HTMLElement = div({ class: 'min-h-0 flex-1 overflow-auto overscroll-contain' })
  const render = (shown: SettingsPage | undefined) => {
    scroller.scrollTop = 0
    return div({ class: 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-2 pb-12' }, shown?.render() ?? null)
  }
  scroller.append(dynamicChild(page, render))
  return div(
    { class: 'flex h-full min-h-0 flex-1 flex-col bg-neutral-900', onMount: node => dismissible(node, close, { overlay: false }) },
    div(
      { class: 'flex h-12 shrink-0 items-center gap-2 pl-4 pr-3' },
      show(narrow, () => iconButton({ title: 'Settings', 'aria-label': 'Settings', onClick: showPages }, icon('menu'))),
      el('h1', { class: 'min-w-0 flex-1 truncate text-sm font-semibold text-neutral-100' }, () => page.get()?.label ?? ''),
      show(narrow, () => iconButton({ title: 'Close settings', 'aria-label': 'Close settings', onClick: close }, icon('x'))),
    ),
    scroller,
  )
}
