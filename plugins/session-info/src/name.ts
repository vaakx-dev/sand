import type { Command } from '@sand/protocol'
import { commandThread } from '@sand/kit'
import type { InfoContext } from './types'

export const nameCommand = (ctx: InfoContext): Command => ({
  name: 'name',
  description: 'Set the thread display name, or show the current name when omitted',
  args: '[name]',
  run(args) {
    const name = args.replace(/\s+/g, ' ').trim()
    const session = ctx.ui.session()
    if (!name) return ctx.ui.notify(session?.title ? `Thread name: ${session.title}` : 'This thread has no name yet')
    commandThread(ctx.ui, ctx.sessions, ctx.modelSettings).rename(name)
    ctx.ui.notify(`Thread renamed to ${name}`)
  },
})
