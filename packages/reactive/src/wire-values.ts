import { wireHello, type Wire } from '@sand/devices-contract'
import type { WireEvent } from '@sand/host-hub/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export interface WireValuesSpec<I, T, P> {
  key(input: I): string
  read(input: I): Promise<T | undefined>
  change: WireEvent<P>
  changed(payload: P): [key: string, value: T]
}

export const wireValues = <I, T, P>(ctx: Context, wire: Wire, spec: WireValuesSpec<I, T, P>) => {
  const asked = new Map<string, I>()
  const known = sig<ReadonlyMap<string, T>>(new Map())

  const keep = (key: string, value: T | undefined) => {
    if (value !== undefined && asked.has(key)) known.update(all => new Map(all).set(key, value))
  }
  const load = (input: I) =>
    void spec.read(input).then(
      value => keep(spec.key(input), value),
      error => ctx.report(error),
    )

  ctx.on(wireHello, () => asked.forEach(load))
  ctx.effect(() => wire.on(spec.change, payload => keep(...spec.changed(payload))))

  return (input: I) => {
    const key = spec.key(input)
    if (!asked.has(key)) {
      asked.set(key, input)
      if (wire.ready()) load(input)
    }
    return known.get().get(key)
  }
}
