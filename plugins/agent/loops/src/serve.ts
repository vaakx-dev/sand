import { joinDisposers } from '@sand/kit'
import type { Choice } from './choice'
import type { LoopsContext } from './context'
import type { Loops } from './contract'

export const serveLoops = (ctx: LoopsContext, loops: Loops, choice: Choice) => {
  ctx.on('session.opened', (opened, thread) => ({ ...opened, loop: choice.state(thread) }))
  ctx.on('session.carry', types => [...types, 'loop'])
  ctx.on('server.hello', hello => ({ ...hello, loops: loops.list() }))
  ctx.watch('server', server => {
    const sessions = ctx.sessions
    if (!server || !sessions) return
    return joinDisposers(
      ctx.on('loop.change', (thread, state) => server.broadcast('loop.change', [thread.id, state])),
      server.handle({
        'loop.choose': request => {
          const thread = sessions.require(request.session)
          loops.choose(thread, request.loop)
          return loops.state(thread)
        },
      }),
    )
  })
}
