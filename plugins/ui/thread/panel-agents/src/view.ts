import { derive, div, groupLabel, hint, icon, list, quietButton, show, sig, span, type Sig } from '@sand/dom'
import { agentRow, type RowActions } from './row'
import type { AgentRow } from './rows'

export interface ParentLink {
  id: string
  title: string
}

export interface AgentsState {
  rows: Sig<AgentRow[]>
  parent: Sig<ParentLink | undefined>
  empty: Sig<string>
  now: Sig<number>
}

const folded = 5

const moreButton = (hidden: Sig<number>, expand: () => void) =>
  show(
    hidden.map(count => count > 0),
    () =>
      quietButton({ size: 'sm', class: 'mt-1 ml-3', onClick: expand }, () => `Show ${hidden.get()} more`),
  )

const section = (title: string, rows: Sig<AgentRow[]>, state: AgentsState, actions: RowActions, fold = false) => {
  const expanded = sig(!fold)
  const shown = derive(() => (expanded.get() ? rows.get() : rows.get().slice(0, folded)))
  const hidden = derive(() => rows.get().length - shown.get().length)
  return show(
    rows.map(items => items.length > 0),
    () =>
      div(
        groupLabel(() => `${title} · ${rows.get().length}`),
        list(shown, row => row.id, row => agentRow(row, state.now, actions)),
        moreButton(hidden, () => expanded.set(true)),
      ),
  )
}

export const agentsView = (state: AgentsState, actions: RowActions) => {
  const running = state.rows.map(rows => rows.filter(row => row.status === 'running'))
  const finished = state.rows.map(rows => rows.filter(row => row.status !== 'running'))
  return div(
    { class: 'px-2 pb-4' },
    show(
      state.parent.map(Boolean),
      () =>
        quietButton(
          {
            size: 'sm',
            class: 'mt-2 w-full',
            onClick: () => {
              const parent = state.parent.get()
              if (parent) actions.open(parent.id)
            },
          },
          icon('up', 13),
          span({ class: 'min-w-0 flex-1 truncate text-left' }, () => `Sub-agent of ${state.parent.get()?.title ?? ''}`),
        ),
    ),
    section('Running', running, state, actions),
    section('Finished', finished, state, actions, true),
    show(
      state.rows.map(rows => !rows.length),
      () => hint(state.empty),
    ),
  )
}
