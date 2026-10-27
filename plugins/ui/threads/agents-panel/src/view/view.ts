import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, show, sig, type Sig } from '@vaakx-dev/vrui'
import { collapseRepeats } from '../runs/repeats'
import type { Run } from '../runs/runs'
import { agentRow } from './agent-row'
import { finishedRow } from './finished'
import type { Actions, Rows } from './parts'

export interface AgentsState {
  runs: Sig<Run[]>
  empty: Sig<string>
  now: Sig<number>
}

const folded = 5

const heading = ({ countMark, sectionHeading }: Kit, label: string, count: () => number) => sectionHeading(label, countMark(count))

const runningSection = (runs: Sig<Run[]>, now: Sig<number>, rows: Rows) =>
  show(
    runs.map(items => items.length > 0),
    () =>
      div(
        heading(rows.kit, 'Running', () => runs.get().length),
        list(
          runs,
          run => run.id,
          run => agentRow(run, now, rows),
        ),
      ),
  )

const finishedSection = (runs: Sig<Run[]>, rows: Rows) => {
  const { quietButton } = rows.kit
  const expanded = sig(false)
  const groups = runs.map(collapseRepeats)
  const shown = derive(() => (expanded.get() ? groups.get() : groups.get().slice(0, folded)))
  const hidden = derive(() => groups.get().length - shown.get().length)
  return show(
    runs.map(items => items.length > 0),
    () =>
      div(
        heading(rows.kit, 'Finished', () => runs.get().length),
        list(
          shown,
          item => item.run.id,
          item => finishedRow(item, rows),
        ),
        show(
          hidden.map(count => count > 0),
          () => quietButton({ size: 'sm', class: 'mt-1', onClick: () => expanded.set(true) }, () => `Show ${hidden.get()} more`),
        ),
      ),
  )
}

export const agentsView = (kit: Kit, state: AgentsState, actions: Actions) => {
  const rows: Rows = { ...actions, menu: kit.contextMenu(), kit }
  return div(
    { class: 'flex flex-col gap-2 px-2 pb-4' },
    runningSection(
      state.runs.map(runs => runs.filter(run => run.status === 'running')),
      state.now,
      rows,
    ),
    finishedSection(
      state.runs.map(runs => runs.filter(run => run.status !== 'running')),
      rows,
    ),
    show(
      state.runs.map(runs => !runs.length),
      () => kit.emptyState({ text: state.empty }),
    ),
    rows.menu.view(),
  )
}
