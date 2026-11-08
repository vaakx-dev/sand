import { type wire, wireHello } from '@sand/devices-contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { botWatchesChangeWire, botWatchList, type BotWatch } from '../contract'

export const createWatches = (ctx: Context<{ wire: typeof wire }>) => {
  const byBot = new Map<string, Sig<BotWatch[]>>()
  const load = (bot: string) =>
    void ctx.wire.call(botWatchList, { bot }).then(
      found => byBot.get(bot)?.set(found),
      error => ctx.report(error),
    )
  ctx.on(wireHello, () => byBot.forEach((_, bot) => load(bot)))
  ctx.effect(() => ctx.wire.on(botWatchesChangeWire, ([bot, found]) => byBot.get(bot)?.set(found)))

  return (bot: string) => {
    let watches = byBot.get(bot)
    if (!watches) {
      watches = sig<BotWatch[]>([])
      byBot.set(bot, watches)
      if (ctx.wire.ready()) load(bot)
    }
    return watches.get()
  }
}
