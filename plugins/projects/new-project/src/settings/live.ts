import { onRaf, sig } from '@sand/dom'
import type { EventName } from 'drydock'
import type { ProjectsContext } from '../context'

export const liveTicks = (ctx: ProjectsContext, events: EventName[]) => {
  const tick = sig(0)
  const mount = (node: HTMLElement) => {
    let pending: (() => void) | undefined
    const schedule = () => {
      pending ??= onRaf(() => {
        pending = undefined
        tick.update(value => value + 1)
      }, node)
    }
    const stops = events.map(name => ctx.on(name, schedule))
    return () => {
      for (const stop of stops) stop()
      pending?.()
    }
  }
  return { tick, mount }
}
