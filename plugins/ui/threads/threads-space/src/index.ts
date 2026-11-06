import { spaces } from '@sand/layout/contract'
import { threadSelect } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { threadsSpace } from './contract'

export default definePlugin({
  name: 'threads-space',
  description: 'The Threads space that the thread list, the conversation and its panels fill; choosing a thread opens it',
  apply(ctx) {
    ctx.watch(spaces, found => found?.space({ id: threadsSpace, label: 'Threads', icon: 'message', order: 10 }))
    ctx.on(threadSelect, (_, visit) => {
      if (visit === 'push') ctx.get(spaces)?.open(threadsSpace, { replace: true })
    })
  },
})
