import { definePlugin } from 'drydock'
import { loopRow } from './row'

export default definePlugin({
  name: 'loops-view',
  description: 'Shows loop changes in the thread with a button to switch back',
  inject: ['wire', 'threads'],
  uses: { transcript: 'loop changes are not shown in the thread' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript?.entry('loop', loopRow(ctx)))
  },
})
