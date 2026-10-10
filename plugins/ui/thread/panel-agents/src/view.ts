import { contextMenu, derive, div, groupLabel, hint, icon, list, quietButton, show, sig, span, type Sig } from '@sand/dom'
import { agentRow } from './agent-row'
import { collapseRepeats, runningAgents } from './counts'
import { finishedRow } from './finished'
import type { Actions, Rows } from './parts'
import type { Run } from './runs'
import { workflowBlock } from './workflow'

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

const parentLink = (parent: Sig<ParentLink | undefined>, open: (id: string) => void) =>
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
      icon('up', 13),
      span({ class: 'min-w-0 flex-1 truncate text-left' }, () => `Sub-agent of ${parent.get()?.title ?? ''}`),
    ),
  )

const runningSection = (runs: Sig<Run[]>, now: Sig<number>, rows: Rows) =>
  show(
    runs.map(items => items.length > 0),
    () =>
      div(
        groupLabel(() => {
          const count = runningAgents(runs.get())
          return `Running · ${count} ${count === 1 ? 'agent' : 'agents'}`
        }),
        list(
          runs,
          run => run.id,
          run => (run.get().kind === 'workflow' ? workflowBlock(run, now, rows) : agentRow(run, now, rows)),
        ),
      ),
  )

const finishedSection = (runs: Sig<Run[]>, now: Sig<number>, rows: Rows) => {
  const expanded = sig(false)
  const groups = runs.map(collapseRepeats)
  const shown = derive(() => (expanded.get() ? groups.get() : groups.get().slice(0, folded)))
  const hidden = derive(() => groups.get().length - shown.get().length)
  return show(
    runs.map(items => items.length > 0),
    () =>
      div(
        groupLabel(() => `Finished · ${runs.get().length}`),
        list(shown, item => item.run.id, item => finishedRow(item, now, rows)),
        show(
          hidden.map(count => count > 0),
          () => quietButton({ size: 'sm', class: 'mt-1 ml-3', onClick: () => expanded.set(true) }, () => `Show ${hidden.get()} more`),
        ),
      ),
  )
}

export const agentsView = (state: AgentsState, actions: Actions) => {
  const rows: Rows = { ...actions, menu: contextMenu() }
  return div(
    { class: 'px-2 pb-4' },
    parentLink(state.parent, actions.open),
    runningSection(
      state.runs.map(runs => runs.filter(run => run.status === 'running')),
      state.now,
      rows,
    ),
    finishedSection(
      state.runs.map(runs => runs.filter(run => run.status !== 'running')),
      state.now,
      rows,
    ),
    show(
      state.runs.map(runs => !runs.length),
      () => hint(state.empty),
    ),
    rows.menu.view(),
  )
}
