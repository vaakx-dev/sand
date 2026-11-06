import type { wire } from '@sand/devices-contract'
import type { kit } from '@sand/ui-kit/contract'
import { errorMessage, exactTime } from '@sand/util'
import { derive, div, dynamicChild, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { routineDelete, routineList, routinePause, routinesChangeWire, type Routine } from '../contract'

export type RoutinesContext = Context<{ kit: typeof kit; wire: typeof wire }>

const timingOf = ({ when, paused, next, last }: Routine) => {
  if (paused) return 'Paused'
  if (next === undefined && last?.outcome === 'failed') return `Failed: ${last.error}`
  const kind = when.kind === 'once' ? 'Once' : 'Repeats'
  return next === undefined ? kind : `${kind} · next ${exactTime(next)}`
}

const routineRow = (ctx: RoutinesContext, routine: Sig<Routine>, failed: (error: unknown) => void) => {
  const { rowAction, settingsRow, toggleSwitch } = ctx.kit
  const { id, name } = routine.get()
  const on = () => !routine.get().paused
  return settingsRow(
    { title: name, detail: () => timingOf(routine.get()) },
    toggleSwitch({
      on,
      title: () => (on() ? 'Pause' : 'Resume'),
      'aria-label': name,
      onClick: () => void ctx.wire.call(routinePause, { routine: id, paused: on() }).catch(failed),
    }),
    rowAction({ label: 'Delete', danger: true, run: () => void ctx.wire.call(routineDelete, { routine: id }).catch(failed) }),
  )
}

export const routinesSection = (ctx: RoutinesContext, bot: string) => {
  const { emptyState, errorText, loadingState, rowDetail, rowList, settingsSection } = ctx.kit
  const routines = sig<Routine[] | undefined>(undefined)
  const failure = sig<string | undefined>(undefined)
  const failed = (error: unknown) => failure.set(errorMessage(error))
  void ctx.wire.call(routineList, { bot }).then(found => routines.set(found), failed)
  const stop = ctx.wire.on(routinesChangeWire, ([changed, found]) => {
    if (changed === bot) routines.set(found)
  })
  const state = derive(() => {
    const found = routines.get()
    if (!found) return 'loading'
    return found.length ? 'routines' : 'empty'
  })
  return div(
    { class: 'contents', onMount: () => stop },
    settingsSection(
      { title: 'Routines' },
      dynamicChild(state, shown => {
        if (shown === 'loading') return loadingState({ surface: 'group' })
        if (shown === 'empty') return emptyState({ surface: 'group', text: 'No routines yet. Ask the bot to remind you of something, or to do something on a schedule.' })
        return rowList(
          routines.map(found => found ?? []),
          routine => routine.id,
          routine => routineRow(ctx, routine, failed),
        )
      }),
      show(
        () => Boolean(failure.get()),
        () => rowDetail(span({ class: 'pt-3' }, errorText(() => failure.get() ?? ''))),
      ),
    ),
  )
}
