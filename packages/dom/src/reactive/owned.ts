import { collectScope, derive, disposeAll, onInterval, onRaf, sig } from '@vaakx-dev/vrui'
import type { Context, EventName, ServiceKey } from 'drydock'

export const owned = <T>(ctx: Context, build: () => T): T => {
  const { value, scope } = collectScope(build)
  ctx.effect(() => () => disposeAll(scope))
  return value
}

export const pulse = (ctx: Context, events: EventName[] = [], services: ServiceKey[] = []) => {
  const version = sig(0)
  let pending: (() => void) | undefined
  const bump = () => version.update(value => value + 1)
  const flush = () => {
    pending = undefined
    bump()
  }
  const schedule = () => {
    if (!pending) pending = collectScope(() => onRaf(flush)).value
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

export const clock = (ms = 1000) => {
  const now = sig(Date.now())
  onInterval(() => now.set(Date.now()), ms)
  return now
}

export const attach = (parent: HTMLElement, build: () => HTMLElement) => {
  const { value, scope } = collectScope(build)
  parent.append(value)
  return () => {
    value.remove()
    disposeAll(scope)
  }
}
