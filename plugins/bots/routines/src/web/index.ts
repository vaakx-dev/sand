import { botAutomations, type BotAutomation } from '@sand/bots/contract'
import { wire } from '@sand/devices-contract'
import { transcript } from '@sand/transcript/contract'
import { oneLine } from '@sand/util'
import { definePlugin } from 'drydock'
import { routineDelete, routinePause, routineRetry, type Routine } from '../contract'
import { createRoutines } from './store'
import { describe } from './when'

const failure = ({ next, last }: Routine) => (next === undefined && last?.outcome === 'failed' ? (last.error ?? 'Failed') : undefined)

export default definePlugin({
  name: 'routines-web',
  description: "Each bot's routines, with their schedule, pause and delete, for the bots UI's automations, and a clock on their wakes in the chat",
  inject: { wire },
  apply(ctx) {
    const routines = createRoutines(ctx)
    const automation = (routine: Routine): BotAutomation => ({
      id: routine.id,
      icon: 'clock',
      title: routine.name,
      when: describe(routine.when),
      detail: oneLine(routine.instructions),
      paused: routine.paused,
      error: failure(routine),
      actions: () => [
        failure(routine)
          ? { id: 'retry', label: 'Try again', run: () => ctx.wire.call(routineRetry, { routine: routine.id }) }
          : {
              id: 'pause',
              label: routine.paused ? 'Resume' : 'Pause',
              run: () => ctx.wire.call(routinePause, { routine: routine.id, paused: !routine.paused }),
            },
        {
          id: 'delete',
          label: 'Delete',
          icon: 'trash',
          danger: true,
          confirm: 'Delete this routine?',
          run: () => ctx.wire.call(routineDelete, { routine: routine.id }),
        },
      ],
    })
    ctx.watch(botAutomations, found => found?.source({ id: 'routines', order: 10, list: bot => routines(bot).map(automation) }))
    ctx.watch(transcript, found => found?.notice('routine', { icon: 'clock' }))
  },
})
