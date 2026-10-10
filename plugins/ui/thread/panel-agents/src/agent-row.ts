import { div, dot, type Sig } from '@sand/dom'
import { headline, markSlot, noteLine, pressable, since, subline, type Actions } from './parts'
import type { Run } from './runs'
import { stopButton } from './stop'

const detail = (run: Run, now: number) => [run.name, run.model, since(run.started, run.ended, now)].filter(Boolean).join(' · ')

export const agentRow = (run: Sig<Run>, now: Sig<number>, actions: Actions) =>
  pressable(
    () => {
      const session = run.get().session
      if (session) actions.open(session)
    },
    () => Boolean(run.get().session),
    'flex items-start gap-3 px-3 py-2',
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
    markSlot(stopButton(() => actions.cancel(run.get()))),
  )
