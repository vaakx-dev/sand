import { botChangeWire, botList, botRemoveWire, type BotSummary } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import { botStartedWire, botStarts } from '../contract'
import type { BridgeWeb } from './context'

export const createRoster = (ctx: BridgeWeb) => {
  const bots = sig<BotSummary[]>([])
  const starts = sig<Record<string, string>>({})

  const load = () =>
    Promise.all([ctx.wire.call(botList, {}), ctx.wire.call(botStarts, {})]).then(([list, started]) => {
      bots.set(list)
      starts.set(started)
    }, error => ctx.report(error))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()
  ctx.effect(() =>
    joinDisposers(
      ctx.wire.on(botChangeWire, bot => bots.update(list => [...list.filter(other => other.id !== bot.id), bot])),
      ctx.wire.on(botRemoveWire, id => bots.update(list => list.filter(other => other.id !== id))),
      ctx.wire.on(botStartedWire, ([thread, bot]) => starts.update(current => ({ ...current, [thread]: bot }))),
    ),
  )

  return {
    list: () => bots.get(),
    find: (id: string) => bots.get().find(bot => bot.id === id),
    starterOf: (thread: string) => starts.get()[thread],
    startedBy: (bot: string) => Object.entries(starts.get()).flatMap(([thread, starter]) => (starter === bot ? [thread] : [])),
  }
}

export type Roster = ReturnType<typeof createRoster>
