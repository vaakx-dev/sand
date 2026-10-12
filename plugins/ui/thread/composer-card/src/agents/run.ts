import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { AgentRun } from '@sand/web-client/contract'
import { derive, span, type Child, type Props, type Sig } from '@vaakx-dev/vrui'
import { progress } from './progress'
import type { Working } from './working'

export const runButton = ({ chipButton }: Kit, state: Working, props: Props<HTMLButtonElement>, ...children: Child[]) =>
  chipButton(
    {
      active: false,
      disabled: derive(() => !state.clickable.get()),
      onClick: state.open,
      ...props,
    },
    ...children,
  )

const title = (run: Sig<AgentRun>) => span({ class: 'min-w-0 truncate' }, run.map(value => value.title))

const workflowParts = ({ icon }: Kit, run: Sig<AgentRun>) => [span({ class: 'inline-flex shrink-0 text-sky-400' }, icon('workflow', 12)), title(run), progress(run)]

const agentParts = ({ elapsed, working }: Kit, run: Sig<AgentRun>) => [working(12), title(run), span({ class: 'shrink-0' }, '· ', elapsed(run.map(value => value.started)))]

export const runChip = (kit: Kit, run: Sig<AgentRun>, state: Working, menu: ContextMenu) => {
  const workflow = run.get().kind === 'workflow'
  return runButton(
    kit,
    state,
    { class: 'max-w-full', title: run.map(value => value.title), ...menu.target(() => state.menu(run.get()), state.open) },
    ...(workflow ? workflowParts(kit, run) : agentParts(kit, run)),
  )
}
