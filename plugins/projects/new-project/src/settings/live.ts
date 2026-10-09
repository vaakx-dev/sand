import { onRaf, sig } from '@sand/dom'
import type { EventName } from 'drydock'
import type { ProjectsContext } from './types'

export const liveTicks = (ctx: ProjectsContext, events: EventName[]) => {
  const tick = sig(0)
  let pending: (() => void) | undefined
  const schedule = () => {
    pending ??= onRaf(() => {
      pending = undefined
      tick.update(value => value + 1)
    })
  }
  const mount = () => {
    const stops = events.map(name => ctx.on(name, schedule))
    return () => {
      for (const stop of stops) stop()
      pending?.()
      pending = undefined
    }
  }
  return { tick, mount }
}
