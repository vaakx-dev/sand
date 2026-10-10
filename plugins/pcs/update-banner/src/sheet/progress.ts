import { derive, div, dynamicChild, icon, list, p, primaryAction, secondaryAction, settingsSection, show, span, spinner, type Sig } from '@sand/dom'
import type { Fleet, PcView } from '../fleet/model'
import { runStatus, type RunStatus } from '../fleet/run'
import { runText } from '../fleet/text'
import { sheetFoot } from './foot'

interface RunRow {
  key: string
  pc?: PcView
  status: RunStatus
}

const statusIcon = (status: RunStatus) => {
  if (status.kind === 'done') return span({ class: 'inline-flex shrink-0 text-success-400' }, icon('check', 16))
  if (status.kind === 'failed') return span({ class: 'inline-flex shrink-0 text-danger-400' }, icon('x', 16))
  if (status.kind === 'working' && status.phase === 'waiting') return span({ class: 'inline-flex shrink-0 text-warning-400' }, icon('clock', 16))
  return span({ class: 'inline-flex shrink-0 text-accent-400' }, spinner(16))
}

const rowAction = (row: Sig<RunRow>, fleet: Fleet) => {
  const { key, status } = row.get()
  if (status.kind === 'failed') return secondaryAction({ size: 'sm', onClick: () => fleet.retry(key) }, 'Try again')
  if (status.kind === 'working' && status.phase === 'waiting' && status.running)
    return secondaryAction({ size: 'sm', onClick: () => void fleet.restartNow(key) }, 'Restart now')
  return span()
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
      row.map(current => `${current.status.kind}:${current.status.kind === 'working' ? `${current.status.phase}:${current.status.running}` : ''}`),
      () => rowAction(row, fleet),
    ),
  )

export const progressBody = (fleet: Fleet, close: () => void) => {
  const rows = derive<RunRow[]>(() => {
    const run = fleet.run.get()
    if (!run) return []
    const pcs = fleet.pcs.get()
    return run.keys.map(key => {
      const pc = pcs.find(item => item.key === key)
      return { key, pc, status: runStatus(pc, run.build) }
    })
  })
  const localName = derive(() => {
    const local = rows.get().find(row => row.pc?.local)
    return local && !fleet.runFinished.get() ? local.pc!.name : ''
  })
  const done = () => {
    fleet.finish()
    close()
  }
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div(
      { class: 'flex min-h-0 flex-col gap-3 overflow-auto px-5 pt-1 pb-5' },
      settingsSection({}, list(rows, row => row.key, row => runRow(row, fleet), div({ class: 'contents' }))),
      show(localName.map(Boolean), () =>
        p({ class: 'px-1 text-xs text-neutral-500' }, () => `This page reconnects by itself when ${localName.get()} is back.`),
      ),
    ),
    sheetFoot(
      dynamicChild(fleet.runFinished, finished =>
        finished ? primaryAction({ onClick: done }, 'Done') : secondaryAction({ onClick: close }, 'Hide'),
      ),
    ),
  )
}
