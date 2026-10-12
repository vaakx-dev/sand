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

const title = (run: Sig<AgentRun>, font?: string) => span({ class: ['min-w-0 truncate', font] }, run.map(value => value.title))

const since = ({ elapsed }: Kit, run: Sig<AgentRun>) => span({ class: 'shrink-0' }, '· ', elapsed(run.map(value => value.started)))

const parts: Record<AgentRun['kind'], (kit: Kit, run: Sig<AgentRun>) => Child[]> = {
  workflow: ({ icon }, run) => [span({ class: 'inline-flex shrink-0 text-sky-400' }, icon('workflow', 12)), title(run), progress(run)],
  agent: (kit, run) => [kit.working(12), title(run), since(kit, run)],
  shell: (kit, run) => [kit.stateMark('shell'), title(run, 'font-mono'), since(kit, run)],
}

export const runChip = (kit: Kit, run: Sig<AgentRun>, state: Working, menu: ContextMenu) =>
  runButton(
    kit,
    state,
    { class: 'max-w-full', title: run.map(value => value.title), ...menu.target(() => state.menu(run.get()), state.open) },
    ...parts[run.get().kind](kit, run),
  )
