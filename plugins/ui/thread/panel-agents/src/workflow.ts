import { div, show, type Sig } from '@sand/dom'
import { agentMenu } from './menu'
import { memberList } from './members'
import { headline, markSlot, noteLine, since, skyDot, subline, type Rows } from './parts'
import type { Run } from './runs'
import { stopButton } from './stop'

const progress = (run: Run, now: number) => {
  const total = run.members.length
  const finished = run.members.filter(member => !member.running).length
  return ['workflow', total ? `${finished} of ${total} finished` : '', since(run.started, run.ended, now)].filter(Boolean).join(' · ')
}

export const workflowBlock = (run: Sig<Run>, now: Sig<number>, rows: Rows) =>
  div(
    { class: 'my-1 rounded-xl bg-neutral-900 p-2' },
    div(
      {
        class: 'flex items-start gap-3 px-2',
        ...rows.menu.target(() => {
          const { title, session, job } = run.get()
          return agentMenu(rows, { title, session, stop: job ? () => rows.cancel(run.get()) : undefined })
        }),
      },
      markSlot(skyDot()),
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
        () => markSlot(stopButton(() => rows.cancel(run.get()))),
      ),
    ),
    show(
      run.map(value => value.members.length > 0),
      () => div({ class: 'mt-2 border-t border-neutral-800 pt-1' }, memberList(run.map(value => value.members), now, rows)),
    ),
  )
