import type { Request } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { wire } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { loginChange, loginDetect, loginStatus, type DetectedServer, type LoginState } from '../contract'

export const loginState = (ctx: Context<{ wire: typeof wire }>) => {
  const state = sig<LoginState | undefined>(undefined)
  const unavailable = sig('')

  ctx.effect(() => ctx.wire.on(loginChange, next => state.set(next)))

  const apply = (next: LoginState) => {
    unavailable.set('')
    state.set(next)
  }

  const load = async () => {
    try {
      apply(await ctx.wire.call(loginStatus, {}))
    } catch (error) {
      unavailable.set(errorMessage(error))
    }
  }

  const run = async <I>(request: Request<I, LoginState>, input: I) => {
    try {
      apply(await ctx.wire.call(request, input))
    } catch {}
  }

  const detect = () => ctx.wire.call(loginDetect, {}).catch((): DetectedServer[] => [])

  const account = (id: string) => state.get()?.accounts.find(found => found.id === id)

  return { state, unavailable, load, run, detect, account }
}

export type LoginControl = ReturnType<typeof loginState>
