import { botRoster, type BotRoster } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import { botStartedWire, botStarts } from '../contract'
import type { BridgeWeb } from './context'

export const createRoster = (ctx: BridgeWeb) => {
  const bots = sig<BotRoster | undefined>(undefined)
  const starts = sig<Record<string, string>>({})

  ctx.watch(botRoster, found => bots.set(found))
  const load = () => ctx.wire.call(botStarts, {}).then(started => starts.set(started), error => ctx.report(error))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()
  ctx.effect(() => ctx.wire.on(botStartedWire, ([thread, bot]) => starts.update(current => ({ ...current, [thread]: bot }))))

  return {
    list: () => bots.get()?.list() ?? [],
    find: (id: string) => bots.get()?.find(id),
    starterOf: (thread: string) => starts.get()[thread],
  }
}

export type Roster = ReturnType<typeof createRoster>
