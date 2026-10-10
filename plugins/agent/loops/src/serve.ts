import type { Choice } from './choice'
import type { LoopsContext } from './context'
import type { Loops } from './contract'

export const serveLoops = (ctx: LoopsContext, loops: Loops, choice: Choice) => {
  const session = (id: string) => {
    const found = ctx.sessions?.open(id)
    if (!found) throw new Error(`No thread ${id}`)
    return found
  }

  ctx.on('session.opened', (opened, thread) => ({ ...opened, loop: choice.state(thread) }))
  ctx.on('session.carry', types => [...types, 'loop'])
  ctx.on('server.hello', hello => ({ ...hello, loops: loops.list() }))
  ctx.watch('server', server => {
    if (!server) return
    const disposers = [
      ctx.on('loop.change', (thread, state) => server.broadcast('loop.change', [thread.id, state])),
      server.handle('loops.list', () => loops.list()),
      server.handle('loop.choose', request => {
        const thread = session(request.session)
        loops.choose(thread, request.loop)
        return loops.state(thread)
      }),
    ]
    return () => disposers.forEach(dispose => void dispose())
  })
}
