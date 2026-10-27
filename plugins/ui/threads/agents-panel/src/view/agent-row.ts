import { div, type Sig } from '@vaakx-dev/vrui'
import type { Run } from '../runs/runs'
import { agentMenu } from './menu'
import { runRow, since, type Rows } from './parts'
import { stopButton } from './stop'

const detail = (run: Run) => run.step || [run.name, run.model].filter(Boolean).join(' · ')

export const agentRow = (run: Sig<Run>, now: Sig<number>, rows: Rows) =>
  div(
    { class: 'flex items-center gap-2' },
    runRow(rows, run, {
      meta: () => detail(run.get()),
      trail: () => since(run.get().started, run.get().ended, now.get()),
      stoppable: true,
      spec: () => agentMenu(rows, { title: run.get().title, session: run.get().session, stop: () => rows.cancel(run.get()) }),
    }),
    stopButton(rows.kit, () => rows.cancel(run.get())),
  )
