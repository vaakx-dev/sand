import { definePlugin } from 'drydock'
import { hooksEntry } from './entry'

export default definePlugin({
  name: 'hooks-view',
  description: 'Shows what hook files did during each turn as one line in the thread',
  uses: {
    transcript: 'what hooks did is not shown in the thread',
  },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript?.entry('hooks', hooksEntry))
  },
})
