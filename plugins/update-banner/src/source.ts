import type { UpdateState } from '@sand/protocol'
import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

export const updateSource = (ctx: Context<'wire'>) => {
  const state = sig<UpdateState | undefined>(undefined)
  const busy = sig(false)

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

  const load = () => {
    ctx.wire.call<UpdateState>({ type: 'updates.state' }).then(next => state.set(next), fail)
  }

  const run = async (call: () => Promise<UpdateState>) => {
    if (busy.get()) return
    busy.set(true)
    try {
      state.set(await call())
    } catch (error) {
      fail(error)
    } finally {
      busy.set(false)
    }
  }

  const later = () => run(() => ctx.wire.call<UpdateState>({ type: 'updates.later' }))

  const apply = () => {
    const offer = state.get()?.offer
    if (!offer) return Promise.resolve()
    return run(() => ctx.wire.call<UpdateState>({ type: 'updates.apply', source: offer.source, build: offer.build.id }))
  }

  ctx.on('wire.hello', load)
  ctx.on('wire.event', event => {
    if (event.name === 'updates.change') state.set(event.args[0])
  })
  if (ctx.wire.hello()) load()

  return { state, busy, later, apply }
}

export type UpdateSource = ReturnType<typeof updateSource>
