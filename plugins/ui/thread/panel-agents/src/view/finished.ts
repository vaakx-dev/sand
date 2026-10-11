import { badge, div, show, sig, span, type Sig } from '@sand/dom'
import type { Repeated } from '../runs/counts'
import type { Run } from '../runs/runs'
import { memberRows } from './members'
import { agentMenu } from './menu'
import { pressable, since, type Rows } from './parts'

const outcomes: Record<Run['status'], { word: string; tone: string }> = {
  running: { word: 'running', tone: 'text-accent-400' },
  done: { word: 'done', tone: 'text-success-400' },
  cancelled: { word: 'stopped', tone: 'text-neutral-500' },
  failed: { word: 'failed', tone: 'text-danger-400' },
}

const outcome = (run: Run) => {
  const { word } = outcomes[run.status]
  return run.ended ? `${word} · ${since(run.started, run.ended, run.ended)}` : word
}

export const finishedRow = (item: Sig<Repeated>, now: Sig<number>, rows: Rows) => {
  const run = item.map(value => value.run)
  const open = sig(false)
  const foldable = () => run.get().kind === 'workflow' && run.get().members.length > 0
  const press = () => {
    const session = run.get().session
    if (session) rows.open(session)
    else if (foldable()) open.set(!open.get())
  }
  return div(
    pressable(
      {
        class: 'flex h-8 items-center gap-2 px-3 text-sm',
        press,
        enabled: () => Boolean(run.get().session) || foldable(),
        menu: { on: rows.menu, spec: () => agentMenu(rows, { title: run.get().title, session: run.get().session }) },
      },
      div(
        { class: 'flex min-w-0 flex-1 items-center gap-2' },
        span({ class: 'min-w-0 truncate text-neutral-200', title: run.map(value => value.title) }, run.map(value => value.title)),
        show(
          item.map(value => value.count > 1),
          () => badge('neutral', () => `×${item.get().count}`),
        ),
      ),
      span({ class: () => ['shrink-0 text-xs tabular-nums', outcomes[run.get().status].tone] }, () => outcome(run.get())),
    ),
    show(open, () =>
      div(
        { class: 'ml-3 border-l border-neutral-800 pl-1' },
        memberRows(
          run.map(value => value.members),
          now,
          rows,
        ),
      ),
    ),
  )
}
