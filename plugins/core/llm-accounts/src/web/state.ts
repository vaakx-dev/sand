import { errorMessage, sig } from '@sand/dom'
import type { WireRequestOf } from '@sand/protocol'
import type { DetectedServer, LoginState } from '../contract'
import type { Context } from 'drydock'

export type LoginRequest = WireRequestOf<'login.start' | 'login.finish' | 'login.key' | 'login.server' | 'login.cancel' | 'login.logout' | 'login.shared'>

export const loginState = (ctx: Context<'wire'>, fail: (error: unknown) => void) => {
  const state = sig<LoginState | undefined>(undefined)
  const unavailable = sig('')

  ctx.on('wire.event', event => {
    if (event.name === 'login.change') state.set(event.args[0] as LoginState)
  })

  const apply = (next: LoginState) => {
    unavailable.set('')
    state.set(next)
  }

  const load = async () => {
    try {
      apply(await ctx.wire.call<LoginState>({ type: 'login.status' }))
    } catch (error) {
      unavailable.set(errorMessage(error))
    }
  }

  const run = async (request: LoginRequest) => {
    try {
      apply(await ctx.wire.call<LoginState>(request))
    } catch (error) {
      fail(error)
    }
  }

  const detect = async () => {
    try {
      return await ctx.wire.call<DetectedServer[]>({ type: 'login.detect' })
    } catch (error) {
      fail(error)
      return []
    }
  }

  const account = (id: string) => state.get()?.accounts.find(found => found.id === id)

  return { state, unavailable, load, run, detect, account }
}

export type LoginControl = ReturnType<typeof loginState>
