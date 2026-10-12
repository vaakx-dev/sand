import { div, show, type Sig } from '@vaakx-dev/vrui'
import type { Run } from '../runs/runs'
import { memberList } from './members'
import { agentMenu } from './menu'
import { headline, markSlot, noteLine, since, subline, type Rows } from './parts'
import { stopButton } from './stop'

const progress = (run: Run, now: number) => {
  const total = run.members.length
  return ['workflow', total ? `${run.finished} of ${total} finished` : '', since(run.started, run.ended, now)].filter(Boolean).join(' · ')
}

const workflowMenu = (run: Run, rows: Rows) =>
  agentMenu(rows, { title: run.title, session: run.session, stop: run.job ? () => rows.cancel(run) : undefined })

export const workflowBlock = (run: Sig<Run>, now: Sig<number>, rows: Rows) => {
  const { dot } = rows.kit
  return div(
    { class: 'my-1 rounded-xl bg-neutral-900 p-2' },
    div(
      { class: 'flex items-start gap-3 px-2', ...rows.menu.target(() => workflowMenu(run.get(), rows)) },
      markSlot(dot('sky')),
      div(
        { class: 'min-w-0 flex-1' },
        headline(run),
        subline(() => progress(run.get(), now.get())),
        noteLine(
          run.map(value => value.note),
          'text-sky-400',
        ),
      ),
      show(
        run.map(value => Boolean(value.job)),
        () => markSlot(stopButton(rows.kit, () => rows.cancel(run.get()))),
      ),
    ),
    show(
      run.map(value => value.members.length > 0),
      () => div({ class: 'mt-2 border-t border-neutral-800 pt-1' }, memberList(run.map(value => value.members), now, rows)),
    ),
  )
}
