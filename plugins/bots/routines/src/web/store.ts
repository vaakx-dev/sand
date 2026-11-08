import { type wire, wireHello } from '@sand/devices-contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { routineList, routinesChangeWire, type Routine } from '../contract'

export const createRoutines = (ctx: Context<{ wire: typeof wire }>) => {
  const byBot = new Map<string, Sig<Routine[]>>()
  const load = (bot: string) =>
    void ctx.wire.call(routineList, { bot }).then(
      found => byBot.get(bot)?.set(found),
      error => ctx.report(error),
    )
  ctx.on(wireHello, () => byBot.forEach((_, bot) => load(bot)))
  ctx.effect(() => ctx.wire.on(routinesChangeWire, ([bot, found]) => byBot.get(bot)?.set(found)))

  return (bot: string) => {
    let routines = byBot.get(bot)
    if (!routines) {
      routines = sig<Routine[]>([])
      byBot.set(bot, routines)
      if (ctx.wire.ready()) load(bot)
    }
    return routines.get()
  }
}
