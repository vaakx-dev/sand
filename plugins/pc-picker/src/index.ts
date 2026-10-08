import { owned, pulse, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { mountSendBack } from './banner/slot'
import { watchTurnEnds } from './banner/turns'
import { createChip } from './chip'
import { refreshOnProjectChange } from './refresh'

export default definePlugin({
  name: 'pc-picker',
  description: 'Pick which PC a thread runs on from the composer, see whether each copy of the project is up to date, and send finished work to the other PCs',
  inject: ['composer', 'threads', 'projects', 'machines'],
  uses: {
    sync: 'no up-to-date status',
    syncFlows: 'copy and send actions do nothing',
    notify: 'no messages about sending newer work',
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
  },
})
