import { collectScope, derive, onRaf, sig } from '@vaakx-dev/vrui'
import type { Context, EventName, ServiceKey } from 'drydock'

export const pulse = (ctx: Context, events: EventName[] = [], services: ServiceKey[] = []) => {
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
  for (const name of events) ctx.on(name, bump)
  for (const key of services) ctx.watch(key, () => bump())
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
