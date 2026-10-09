import type { UpdateChannel, UpdateState } from '@sand/host-updates/contract'
import type { WireRequest } from '@sand/protocol'
import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

export const updateSource = (ctx: Context<'wire'>) => {
  const state = sig<UpdateState | undefined>(undefined)
  const busy = sig(false)

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

  const load = () => {
    ctx.wire.call<UpdateState>({ type: 'updates.state' }).then(next => state.set(next), fail)
  }

  const run = async (request: WireRequest) => {
    if (busy.get()) return
    busy.set(true)
    try {
      state.set(await ctx.wire.call<UpdateState>(request))
    } catch (error) {
      fail(error)
    } finally {
      busy.set(false)
    }
  }

  const later = () => run({ type: 'updates.later' })

  const check = () => run({ type: 'updates.check' })

  const setChannel = (channel: UpdateChannel) => run({ type: 'updates.channel', channel })

  const apply = () => {
    const latest = state.get()?.latest
    return latest ? run({ type: 'updates.apply', build: latest.build.id }) : Promise.resolve()
  }

  ctx.on('wire.hello', load)
  ctx.on('wire.event', event => {
    if (event.name === 'updates.change') state.set(event.args[0])
  })
  if (ctx.wire.hello()) load()

  return { state, busy, later, check, setChannel, apply }
}

export type UpdateSource = ReturnType<typeof updateSource>
