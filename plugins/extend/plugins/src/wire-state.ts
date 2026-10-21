import type { Request } from '@sand/host-hub/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WireContext } from './context'

export const wireState = <T>(ctx: WireContext) => {
  const value = sig<T | undefined>(undefined)
  const busy = sig<string | undefined>(undefined)

  const call = <I>(request: Request<I, T>, input: I) =>
    ctx.wire.call(request, input).then(
      next => value.set(next),
      () => {},
    )

  const load = <I>(request: Request<I, T>, input: I) => {
    void call(request, input)
  }

  const run = async <I>(key: string, request: Request<I, T>, input: I) => {
    busy.set(key)
    await call(request, input)
    busy.set(undefined)
  }

  return { value, busy, load, run }
}
