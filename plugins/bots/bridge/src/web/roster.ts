import { botRoster, type BotRoster } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import { botSubagentWire, botSubagents } from '../contract'
import type { BridgeWeb } from './context'

export const createRoster = (ctx: BridgeWeb) => {
  const bots = sig<BotRoster | undefined>(undefined)
  const starters = sig<Record<string, string>>({})

  ctx.watch(botRoster, found => bots.set(found))
  const load = () => ctx.wire.call(botSubagents, {}).then(started => starters.set(started), error => ctx.report(error))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()
  ctx.effect(() => ctx.wire.on(botSubagentWire, ([subagent, bot]) => starters.update(current => ({ ...current, [subagent]: bot }))))

  return {
    list: () => bots.get()?.list() ?? [],
    find: (id: string) => bots.get()?.find(id),
    starterOf: (subagent: string) => starters.get()[subagent],
  }
}

export type Roster = ReturnType<typeof createRoster>
