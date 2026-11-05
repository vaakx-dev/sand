import { collectScope, derive, onRaf, sig } from '@vaakx-dev/vrui'
import type { Context, Event, Service, Signature } from 'drydock'

export const pulse = (ctx: Context, events: Event<Signature>[] = [], services: Service<unknown>[] = []) => {
  const version = sig(0)
  const bump = () => version.update(value => value + 1)
  let pending: (() => void) | undefined
  const flush = () => {
    pending = undefined
    bump()
  }
  const schedule = () => {
    pending ??= collectScope(() => onRaf(flush)).value
  }
  for (const event of events) ctx.on(event, bump)
  for (const service of services) ctx.watch(service, () => bump())
  ctx.effect(() => () => pending?.())
  return {
    version,
    bump,
    schedule,
    read: <T>(read: () => T) =>
      derive(() => {
        version.get()
        return read()
      }),
  }
}

export type Pulse = ReturnType<typeof pulse>
