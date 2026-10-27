import type { Kit, StepState } from '@sand/ui-kit/contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { actionButton, fleetAction, runActionKind } from '../actions'
import type { Fleet, RunRow } from '../fleet/model'
import type { RunStatus } from '../fleet/run'
import { runText } from '../fleet/text'

const stepState = (status: RunStatus): StepState => {
  if (status.kind === 'done') return 'done'
  if (status.kind === 'failed') return 'failed'
  if (status.kind === 'working' && status.phase === 'waiting') return 'waiting'
  return 'running'
}

const runDetail = (row: Sig<RunRow>) =>
  span({ class: ['wrap-anywhere', () => (row.get().status.kind === 'failed' ? 'text-danger-400' : '')] }, () => runText(row.get().status))

const runRow = (kit: Kit, row: Sig<RunRow>, fleet: Fleet) => {
  const { settingsRow, stepMark } = kit
  return settingsRow(
    {
      lead: dynamicChild(row.map(current => stepState(current.status)), stepMark),
      title: () => row.get().pc?.name ?? 'PC',
      detail: runDetail(row),
    },
    dynamicChild(
      row.map(current => runActionKind(current.status)),
      kind => (kind ? actionButton(kit, fleetAction(fleet, row.get().key, kind)) : null),
    ),
  )
}

export const progressBody = (kit: Kit, fleet: Fleet, close: () => void) => {
  const { primaryAction, rowList, secondaryAction, settingsSection, sheetBody, sheetFoot } = kit
  const done = () => {
    fleet.finish()
    close()
  }
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    sheetBody({}, settingsSection({}, rowList(fleet.runRows, row => row.key, row => runRow(kit, row, fleet)))),
    sheetFoot(
      dynamicChild(fleet.runFinished, finished => (finished ? primaryAction({ onClick: done }, 'Done') : secondaryAction({ onClick: close }, 'Hide'))),
    ),
  )
}
