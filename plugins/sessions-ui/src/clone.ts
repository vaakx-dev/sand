import type { Command } from '@sand/protocol'
import type { SessionsContext } from './types'

export const cloneCommand = (ctx: SessionsContext): Command => ({
  name: 'clone',
  title: 'Duplicate thread',
  description: 'Duplicate the current thread at its current position',
  run() {
    const session = ctx.ui.session()
    if (!session?.head) return ctx.ui.notify('Nothing to clone yet')
    if (ctx.loop?.active(session)) return ctx.ui.notify('Wait for the current turn to finish', 'error')
    ctx.ui.open(ctx.sessions.branch(session))
    ctx.ui.notify('Cloned into a new thread.')
  },
})
