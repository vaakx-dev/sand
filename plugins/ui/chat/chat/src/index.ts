import { place } from '@sand/layout/contract'
import { owned } from '@sand/reactive'
import { modelsChange, threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { threadsSlot } from '@sand/threads-space/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { chatController } from './controller'

export default definePlugin({
  name: 'chat',
  description: 'The thread chat: a thread transcript with "Worked for" turns, branches, queued messages and scrolling that keeps your place',
  inject,
  apply(ctx) {
    const chat = owned(ctx, () => {
      const controller = chatController(ctx)
      const { version, footers } = ctx.transcriptParts
      effect(() => {
        version.get()
        footers.get()
        untrack(controller.refresh)
      })
      return controller
    })
    place(ctx, threadsSlot('main'), chat.root, 1)
    ctx.on(threadChange, id => {
      if (id === ctx.threads.current()?.id) chat.render()
    })
    ctx.on(threadSelect, () => chat.render())
    ctx.on(threadsChange, chat.forget)
    ctx.on(modelsChange, chat.refresh)
  },
})
