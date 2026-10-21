import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { derive, div, list, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import { collapseRepeats } from '../runs/repeats'
import type { Run } from '../runs/runs'
import { agentRow } from './agent-row'
import { finishedRow } from './finished'
import type { Actions, Rows } from './parts'

export interface ParentLink {
  id: string
  title: string
}

export interface AgentsState {
  runs: Sig<Run[]>
  parent: Sig<ParentLink | undefined>
  empty: Sig<string>
  now: Sig<number>
}

const folded = 5

const parentLink = ({ icon, quietButton }: Kit, parent: Sig<ParentLink | undefined>, open: (id: string) => void) =>
  show(parent.map(Boolean), () =>
    quietButton(
      {
        size: 'sm',
        class: 'mt-2 w-full',
        onClick: () => {
          const above = parent.get()
          if (above) open(above.id)
        },
      },
      icon('up', 14),
      span({ class: 'min-w-0 flex-1 truncate text-left' }, () => `Sub-agent of ${parent.get()?.title ?? ''}`),
    ),
  )

const runningSection = (runs: Sig<Run[]>, now: Sig<number>, rows: Rows) =>
  show(
    runs.map(items => items.length > 0),
    () =>
      div(
        rows.kit.groupLabel(() => `Running · ${plural(runs.get().length, 'agent')}`),
        list(
          runs,
          run => run.id,
          run => agentRow(run, now, rows),
        ),
      ),
  )

const finishedSection = (runs: Sig<Run[]>, rows: Rows) => {
  const { groupLabel, quietButton } = rows.kit
  const expanded = sig(false)
  const groups = runs.map(collapseRepeats)
  const shown = derive(() => (expanded.get() ? groups.get() : groups.get().slice(0, folded)))
  const hidden = derive(() => groups.get().length - shown.get().length)
  return show(
    runs.map(items => items.length > 0),
    () =>
      div(
        groupLabel(() => `Finished · ${runs.get().length}`),
        list(
          shown,
          item => item.run.id,
          item => finishedRow(item, rows),
        ),
        show(
          hidden.map(count => count > 0),
          () => quietButton({ size: 'sm', class: 'mt-1 ml-3', onClick: () => expanded.set(true) }, () => `Show ${hidden.get()} more`),
        ),
      ),
  )
}

export const agentsView = (kit: Kit, state: AgentsState, actions: Actions) => {
  const rows: Rows = { ...actions, menu: kit.contextMenu(), kit }
  return div(
    { class: 'px-2 pb-4' },
    parentLink(kit, state.parent, actions.open),
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
      () => kit.hint(state.empty),
    ),
    rows.menu.view(),
  )
}
