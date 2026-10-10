import { derive, div, dynamicChild, icon, list, p, primaryAction, secondaryAction, settingsSection, show, span, spinner, type Sig } from '@sand/dom'
import { actionButton, fleetAction, runActionKind } from '../actions'
import type { Fleet, RunRow } from '../fleet/model'
import type { RunStatus } from '../fleet/run'
import { runText } from '../fleet/text'
import { statusMark } from '../mark'
import { sheetFoot } from './foot'

const statusIcon = (status: RunStatus) => {
  if (status.kind === 'done') return statusMark('text-success-400', icon('check', 16))
  if (status.kind === 'failed') return statusMark('text-danger-400', icon('x', 16))
  if (status.kind === 'working' && status.phase === 'waiting') return statusMark('text-warning-400', icon('clock', 16))
  return statusMark('text-accent-400', spinner(16))
}

const runRow = (row: Sig<RunRow>, fleet: Fleet) =>
  div(
    { class: 'flex items-start gap-3 bg-neutral-900 px-4 py-3' },
    div({ class: 'flex h-5 shrink-0 items-center' }, dynamicChild(row.map(current => current.status), statusIcon)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm text-neutral-100' }, () => row.get().pc?.name ?? 'PC'),
      span(
        { class: () => (row.get().status.kind === 'failed' ? 'text-xs wrap-anywhere text-danger-400' : 'text-xs text-neutral-500') },
        () => runText(row.get().status),
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
    div(
      { class: 'flex min-h-0 flex-col gap-3 overflow-auto px-5 pt-1 pb-5' },
      settingsSection({}, list(fleet.runRows, row => row.key, row => runRow(row, fleet), div({ class: 'contents' }))),
      show(localName.map(Boolean), () => p({ class: 'px-1 text-xs text-neutral-500' }, () => `This page reconnects by itself when ${localName.get()} is back.`)),
    ),
    sheetFoot(
      dynamicChild(fleet.runFinished, finished => (finished ? primaryAction({ onClick: done }, 'Done') : secondaryAction({ onClick: close }, 'Hide'))),
    ),
  )
}
