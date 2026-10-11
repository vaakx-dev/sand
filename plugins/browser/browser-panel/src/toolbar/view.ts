import type { HistoryAction } from '@sand/browser-engine/contract'
import { div, icon, iconButton, show, span, type Sig } from '@sand/dom'
import type { TabModel } from '../tab/model'
import { urlField } from './url'

export interface ToolbarParts {
  tab: TabModel
  picking: Sig<boolean>
  consoleOpen: Sig<boolean>
  go(url: string): void
  history(action: HistoryAction): void
  screenshot(): void
  togglePick(): void
}

const noTab = (tab: TabModel) => () => !tab.open.get()

export const toolbar = (parts: ToolbarParts) => {
  const { tab } = parts
  return div(
    { class: 'flex shrink-0 flex-wrap items-center gap-1 border-b border-neutral-800 px-2 py-2' },
    iconButton(
      { title: 'Back', 'aria-label': 'Back', disabled: () => !tab.state.get()?.canBack, onClick: () => parts.history('back') },
      icon('back', 15),
    ),
    iconButton(
      { title: 'Forward', 'aria-label': 'Forward', disabled: () => !tab.state.get()?.canForward, onClick: () => parts.history('forward') },
      icon('forward', 15),
    ),
    iconButton(
      { title: 'Reload', 'aria-label': 'Reload', disabled: noTab(tab), onClick: () => parts.history('reload') },
      span({ class: ['inline-flex', () => (tab.state.get()?.loading ? 'animate-spin' : '')] }, icon('reload', 14)),
    ),
    urlField({ url: () => tab.state.get()?.url ?? '', title: () => tab.state.get()?.title ?? '', open: parts.go }),
    iconButton(
      { title: 'Pick an element', 'aria-label': 'Pick an element', active: () => parts.picking.get(), disabled: noTab(tab), onClick: parts.togglePick },
      icon('pick', 15),
    ),
    iconButton({ title: 'Attach a screenshot', 'aria-label': 'Attach a screenshot', disabled: noTab(tab), onClick: parts.screenshot }, icon('camera', 15)),
    iconButton(
      {
        class: 'relative',
        title: 'Console',
        'aria-label': 'Console',
        active: () => parts.consoleOpen.get(),
        disabled: noTab(tab),
        onClick: () => parts.consoleOpen.set(!parts.consoleOpen.get()),
      },
      icon('term', 15),
      show(
        () => (tab.state.get()?.errors ?? 0) > 0,
        () => span({ class: 'absolute right-1 top-1 h-2 w-2 rounded-full bg-danger-400' }),
      ),
    ),
  )
}
