import type { Context } from 'drydock'
import type { AskPending } from '../contract'

export const serverAsks = (ctx: Context, changed: () => void) => {
  const open = new Map<string, AskPending>()

  const replace = (list: AskPending[]) => {
    open.clear()
    for (const pending of list) open.set(pending.id, pending)
    changed()
  }

  ctx.on('wire.hello', hello => replace(hello.asks ?? []))
  ctx.on('wire.event', event => {
    if (event.name === 'ask.open') open.set(event.args[0].id, event.args[0])
    else if (event.name === 'ask.close') open.delete(event.args[1])
    else return
    changed()
  })

  return { forThread: (thread: string) => [...open.values()].find(pending => pending.session === thread) }
}

export type ServerAsks = ReturnType<typeof serverAsks>
