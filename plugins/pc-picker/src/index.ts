import { owned, pulse, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { mountSendBack } from './banner/slot'
import { watchTurnEnds } from './banner/turns'
import { createChip } from './chip'
import { continueCommand } from './continue/command'
import { continuedMarker } from './continue/marker'
import { refreshOnProjectChange } from './refresh'

export default definePlugin({
  name: 'pc-picker',
  description:
    'Pick which PC a new thread runs on from the composer, continue a started thread on another PC, see whether each copy of the project is up to date, and send finished work to the other PCs',
  inject: ['composer', 'threads', 'projects', 'machines', 'wire'],
  uses: {
    sync: 'no up-to-date status and no offer to send changes before continuing',
    syncFlows: "a PC without a copy of the project can't get one when starting or continuing a thread",
    notify: 'no messages about sending newer work or continuing threads',
    picker: 'no folder prompt for threads outside a project and no prompt to send changes before continuing',
    transcript: 'no continued-on markers in threads',
    commands: 'no /continue command',
  },
  apply(ctx) {
    const changes = pulse(ctx, ['sync.change', 'projects.change', 'machines.change', 'thread.select', 'threads.change', 'drafts.change'])
    const armed = sig<string | undefined>(undefined)
    const chip = owned(ctx, () => createChip(ctx, changes))

    refreshOnProjectChange(ctx)
    watchTurnEnds(ctx, armed)

    ctx.effect(() => {
      const remove = ctx.composer.slot('start', chip.pill, 1)
      return () => void remove()
    })
    ctx.effect(() => mountSendBack(ctx, ctx.composer, changes, armed))

    ctx.watch('commands', commands => commands?.add(continueCommand(ctx)))
    ctx.watch('transcript', transcript => {
      if (!transcript) return
      const disposers = [
        transcript.entry('continued-from', continuedMarker(ctx, 'continued-from')),
        transcript.entry('continued-to', continuedMarker(ctx, 'continued-to')),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
