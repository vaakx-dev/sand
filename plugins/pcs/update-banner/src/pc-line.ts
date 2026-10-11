import { dot, dynamicChild, span, statusLine, type Sig } from '@sand/dom'
import { plural } from '@sand/kit'
import type { Fleet, PcView } from './fleet/model'
import { canUpdate } from './fleet/status'
import { statusText, statusTone } from './fleet/text'

const runningNote = (pc: PcView) => {
  const running = pc.state?.running ?? 0
  return canUpdate(pc.status) && running ? `· ${plural(running, 'thread')} running` : ''
}

export const pcStatusLine = (row: Sig<PcView>, fleet: Fleet, prefix: () => string = () => '') =>
  statusLine(
    {
      mark: dynamicChild(
        row.map(pc => statusTone(pc.status)),
        dot,
      ),
      text: () => [prefix(), statusText(row.get().status, fleet.target.get())].filter(Boolean).join(' · '),
      title: () => statusText(row.get().status, fleet.target.get()),
    },
    span({ class: 'shrink-0 text-warning-400' }, () => runningNote(row.get())),
  )
