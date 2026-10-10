import { div, dot, dynamicChild, span, type Sig } from '@sand/dom'
import type { Fleet, PcView } from './fleet/model'
import { canUpdate } from './fleet/status'
import { plural, statusText, statusTone } from './fleet/text'

const runningNote = (pc: PcView) => {
  const running = pc.state?.running ?? 0
  return canUpdate(pc.status) && running ? `· ${plural(running, 'thread')} running` : ''
}

export const pcStatusLine = (row: Sig<PcView>, fleet: Fleet, prefix: () => string = () => '') =>
  div(
    { class: 'flex min-w-0 items-center gap-2 text-xs text-neutral-500' },
    dynamicChild(
      row.map(pc => statusTone(pc.status)),
      dot,
    ),
    span({ class: 'min-w-0 truncate', title: () => statusText(row.get().status, fleet.target.get()) }, () =>
      [prefix(), statusText(row.get().status, fleet.target.get())].filter(Boolean).join(' · '),
    ),
    span({ class: 'shrink-0 text-warning-400' }, () => runningNote(row.get())),
  )
