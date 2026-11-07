import { wireHello } from '@sand/devices-contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import { type BotWatch, botWatchesChangeWire, botWatchList } from '../contract'
import type { ListeningContext } from './context'

export const createWatchStore = (ctx: ListeningContext) => {
  const byBot = new Map<string, Sig<BotWatch[]>>()

  const load = (bot: string, found: Sig<BotWatch[]>) =>
    void ctx.wire.call(botWatchList, { bot }).then(
      watches => found.set(watches),
      error => ctx.report(error),
    )

  ctx.on(wireHello, () => {
    for (const [bot, found] of byBot) load(bot, found)
  })
  ctx.effect(() => ctx.wire.on(botWatchesChangeWire, ([bot, watches]) => byBot.get(bot)?.set(watches)))

  return (bot: string) => {
    const known = byBot.get(bot)
    if (known) return known
    const found = sig<BotWatch[]>([])
    byBot.set(bot, found)
    if (ctx.wire.ready()) load(bot, found)
    return found
  }
}
