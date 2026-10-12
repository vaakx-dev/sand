import { derive, div, dynamicChild, p, primaryAction, rowList, secondaryAction, sectionRow, settingsSection, sheetBody, sheetFoot, show, span, stepMark, type Sig, type StepState } from '@sand/dom'
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

const runRow = (row: Sig<RunRow>, fleet: Fleet) =>
  sectionRow(
    {},
    div(
      { class: 'flex min-w-0 flex-1 items-start gap-2' },
      div({ class: 'flex h-5 shrink-0 items-center' }, dynamicChild(row.map(current => stepState(current.status)), stepMark)),
      div(
        { class: 'flex min-w-0 flex-1 flex-col' },
        span({ class: 'truncate text-sm font-medium text-neutral-100' }, () => row.get().pc?.name ?? 'PC'),
        span(
          { class: () => (row.get().status.kind === 'failed' ? 'text-xs wrap-anywhere text-danger-400' : 'text-xs text-neutral-500') },
          () => runText(row.get().status),
        ),
      ),
    ),
    dynamicChild(
      row.map(current => runActionKind(current.status)),
      kind => (kind ? actionButton(fleetAction(fleet, row.get().key, kind)) : null),
    ),
  )

export const progressBody = (fleet: Fleet, close: () => void) => {
  const localName = derive(() => (fleet.runFinished.get() ? '' : (fleet.runRows.get().find(row => row.pc?.local)?.pc?.name ?? '')))
  const done = () => {
    fleet.finish()
    close()
  }
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    sheetBody(
      {},
      settingsSection({}, rowList(fleet.runRows, row => row.key, row => runRow(row, fleet))),
      show(localName.map(Boolean), () => p({ class: 'px-1 text-xs text-neutral-500' }, () => `This page reconnects by itself when ${localName.get()} is back.`)),
    ),
    sheetFoot(
      dynamicChild(fleet.runFinished, finished => (finished ? primaryAction({ onClick: done }, 'Done') : secondaryAction({ onClick: close }, 'Hide'))),
    ),
  )
}
