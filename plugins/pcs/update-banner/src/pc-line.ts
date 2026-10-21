import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import type { Fleet, PcView } from './fleet/model'
import { canUpdate } from './fleet/status'
import { statusText, statusTone } from './fleet/text'

const runningNote = (pc: PcView) => {
  const running = pc.state?.running ?? 0
  return canUpdate(pc.status) && running ? `· ${plural(running, 'chat')} running` : ''
}

export const pcStatusLine = ({ dot, statusLine }: Kit, row: Sig<PcView>, fleet: Fleet, prefix: () => string = () => '') =>
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
