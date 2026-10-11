import { derive, elapsed, icon, plainButton, span, working, type Child, type ContextMenu, type Props, type Sig } from '@sand/dom'
import type { AgentRun } from '@sand/web-client/contract'
import { progress } from './progress'
import type { Working } from './working'

export const chipButton = (state: Working, { class: tone, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton(
    {
      disabled: derive(() => !state.clickable.get()),
      onClick: state.open,
      ...props,
      class: ['inline-flex h-6 min-w-0 max-w-full items-center gap-2 whitespace-nowrap rounded-md bg-neutral-800 px-2 text-xs transition-colors hover:bg-neutral-700', tone],
    },
    ...children,
  )

const title = (run: Sig<AgentRun>) => span({ class: 'min-w-0 truncate' }, run.map(value => value.title))

const workflowParts = (run: Sig<AgentRun>) => [span({ class: 'inline-flex shrink-0' }, icon('workflow', 13)), title(run), progress(run)]

const agentParts = (run: Sig<AgentRun>) => [working(13), title(run), span({ class: 'shrink-0' }, '· ', elapsed(run.map(value => value.started)))]

export const runChip = (run: Sig<AgentRun>, state: Working, menu: ContextMenu) => {
  const workflow = run.get().kind === 'workflow'
  return chipButton(
    state,
    { class: workflow ? 'text-sky-400' : 'text-accent-400', title: run.map(value => value.title), ...menu.target(() => state.menu(run.get()), state.open) },
    ...(workflow ? workflowParts(run) : agentParts(run)),
  )
}
