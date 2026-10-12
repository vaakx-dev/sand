import type { Logs } from '@sand/browser-engine/contract'
import { toEnd } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { TabModel } from '../tab/model'
import { consoleRow, networkRow } from './rows'

type LogTab = 'console' | 'network'

const shownEntries = 500

const noLogs: Logs = { console: [], network: [] }

const entries = ({ hint }: Kit, which: LogTab, logs: Logs) => {
  const rows = which === 'console' ? logs.console.slice(-shownEntries).map(consoleRow) : logs.network.slice(-shownEntries).map(networkRow)
  return div(
    { class: 'min-h-0 flex-1 overflow-auto', onMount: node => toEnd(node as HTMLElement) },
    rows.length ? rows : hint(which === 'console' ? 'No console messages yet' : 'No requests yet'),
  )
}

export const consoleDrawer = (kit: Kit, tab: TabModel, close: () => void) => {
  const { closeButton, icon, iconButton, segmented } = kit
  const which = sig<LogTab>('console')
  const logs = sig<Logs>(noLogs)
  const errors = tab.state.map(state => state?.errors ?? 0)
  const load = () =>
    void tab.logs().then(
      next => logs.set(next ?? noLogs),
      () => undefined,
    )

  effect(() => {
    tab.key.get()
    errors.get()
    untrack(load)
  })

  return div(
    { class: 'absolute inset-x-0 bottom-0 flex h-1/2 flex-col border-t border-neutral-700 bg-neutral-950 shadow-xl animate-rise' },
    div(
      { class: 'flex h-10 shrink-0 items-center gap-1 px-2' },
      segmented<LogTab>(
        [
          { value: 'console', label: 'Console' },
          { value: 'network', label: 'Network' },
        ],
        which,
        value => which.set(value),
        { label: 'Log' },
      ),
      div({ class: 'flex-1' }),
      iconButton({ size: 'sm', title: 'Refresh', 'aria-label': 'Refresh', onClick: load }, icon('reload', 14)),
      closeButton({ title: 'Close', size: 'sm', onClick: close }),
    ),
    dynamicChild(
      derive(() => ({ shown: which.get(), all: logs.get() })),
      ({ shown, all }) => entries(kit, shown, all),
    ),
  )
}
