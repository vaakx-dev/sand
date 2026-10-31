import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { snapshotsChange, snapshotsClient, snapshotsList, snapshotsRestore } from '../contract'

export default definePlugin({
  name: 'git-snapshots',
  description: "Reads and restores a thread's turn snapshots for the page, from the PC that ran the thread",
  inject: { wire },
  apply(ctx) {
    const { wire } = ctx
    ctx.provide(snapshotsClient, {
      list: input => wire.call(snapshotsList, input),
      restore: input => wire.call(snapshotsRestore, input),
      onChange: listener => wire.on(snapshotsChange, listener, { from: 'all' }),
    })
  },
})
