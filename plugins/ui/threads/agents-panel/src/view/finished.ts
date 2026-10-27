import type { JobStatus } from '@sand/jobs/contract'
import { show, span, type Sig } from '@vaakx-dev/vrui'
import type { Run } from '../runs/runs'
import type { Repeated } from '../runs/repeats'
import { agentMenu } from './menu'
import { runRow, since, type Rows } from './parts'

const outcomes: Partial<Record<JobStatus, { label: string; tone: string }>> = {
  failed: { label: 'Failed', tone: 'text-danger-400' },
  cancelled: { label: 'Stopped', tone: 'text-neutral-500' },
}

const outcome = (run: Sig<Run>) => {
  const found = () => outcomes[run.get().status]
  return show(
    () => Boolean(found()),
    () => span({ class: () => found()?.tone ?? '' }, () => found()?.label ?? ''),
  )
}

const took = ({ started, ended }: Run) => (ended ? since(started, ended, ended) : '')

export const finishedRow = (item: Sig<Repeated>, rows: Rows) => {
  const run = item.map(value => value.run)
  return runRow(rows, run, {
    trail: [
      show(
        item.map(value => value.count > 1),
        () => span({ class: 'tabular-nums' }, () => `×${item.get().count}`),
      ),
      span({ class: 'tabular-nums' }, () => took(run.get())),
      outcome(run),
    ],
    stoppable: false,
    spec: () => agentMenu(rows, { title: run.get().title, session: run.get().session }),
  })
}
