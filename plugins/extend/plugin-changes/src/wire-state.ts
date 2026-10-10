import { errorMessage, sig } from '@sand/dom'
import type { Context, Services } from 'drydock'

type WireRequest = Parameters<Services['wire']['call']>[0]

export const wireState = <T>(ctx: Context<'wire'>) => {
  const value = sig<T | undefined>(undefined)
  const busy = sig<string | undefined>(undefined)

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

  const load = (request: WireRequest) => {
    ctx.wire.call<T>(request).then(next => value.set(next), fail)
  }

  const run = async (key: string, request: WireRequest) => {
    busy.set(key)
    try {
      value.set(await ctx.wire.call<T>(request))
      return true
    } catch (error) {
      fail(error)
      return false
    } finally {
      busy.set(undefined)
    }
  }

  return { value, busy, fail, load, run }
}
