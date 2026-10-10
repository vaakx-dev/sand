import { button, derive, elapsed, focusable, icon, span, working, type Child, type MaybeReactive, type Sig } from '@sand/dom'
import type { AgentRun } from '@sand/web-client/contract'
import { progress } from './progress'
import type { Working } from './working'

export const chipButton = (state: Working, tone: string, title: MaybeReactive<string>, ...children: Child[]) =>
  button(
    {
      type: 'button',
      title,
      disabled: derive(() => !state.clickable.get()),
      onClick: state.open,
      class: [focusable, 'inline-flex h-6 min-w-0 max-w-full items-center gap-2 whitespace-nowrap rounded-md bg-neutral-800 px-2 text-xs transition-colors hover:bg-neutral-700', tone],
    },
    ...children,
  )

const label = (run: Sig<AgentRun>) => span({ class: 'min-w-0 truncate' }, run.map(value => value.title))

const workflowChip = (run: Sig<AgentRun>, state: Working) =>
  chipButton(
    state,
    'text-sky-400',
    run.map(value => value.title),
    span({ class: 'inline-flex shrink-0' }, icon('workflow', 13)),
    label(run),
    progress(run.map(value => value.agents)),
  )

const agentChip = (run: Sig<AgentRun>, state: Working) =>
  chipButton(
    state,
    'text-accent-400',
    run.map(value => value.title),
    working(13),
    label(run),
    span({ class: 'shrink-0' }, '· ', elapsed(run.map(value => value.started))),
  )

export const runChip = (run: Sig<AgentRun>, state: Working) => (run.get().kind === 'workflow' ? workflowChip(run, state) : agentChip(run, state))
