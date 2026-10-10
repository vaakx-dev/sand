import { div, dot, type Sig } from '@sand/dom'
import type { Run } from '../runs/runs'
import { agentMenu } from './menu'
import { headline, markSlot, noteLine, pressable, since, subline, type Rows } from './parts'
import { stopButton } from './stop'

const detail = (run: Run, now: number) => [run.name, run.model, since(run.started, run.ended, now)].filter(Boolean).join(' · ')

const openSession = (run: Run, rows: Rows) => {
  if (run.session) rows.open(run.session)
}

export const agentRow = (run: Sig<Run>, now: Sig<number>, rows: Rows) =>
  pressable(
    {
      class: 'flex items-start gap-3 px-3 py-2',
      press: () => openSession(run.get(), rows),
      enabled: () => Boolean(run.get().session),
      menu: { on: rows.menu, spec: () => agentMenu(rows, { title: run.get().title, session: run.get().session, stop: () => rows.cancel(run.get()) }) },
    },
    markSlot(dot('accent')),
    div(
      { class: 'min-w-0 flex-1' },
      headline(run),
      subline(() => detail(run.get(), now.get())),
      noteLine(
        run.map(value => value.step),
        'text-accent-400',
      ),
    ),
    markSlot(stopButton(() => rows.cancel(run.get()))),
  )
