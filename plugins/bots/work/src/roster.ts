import { botStarters, type BotStarters } from '@sand/bot-bridge/contract'
import { botChangeWire, botList, botName } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { readLimit, threadList } from '@sand/orchestrator/contract'
import { turnGet } from '@sand/turns-contract/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'

const failedStatuses = new Set<string>(['failed', 'lost'])

export const createRoster = (ctx: WorkContext) => {
  const starters = sig<BotStarters | undefined>(undefined)
  const names = sig<Record<string, string>>({})
  const failures = sig<Record<string, string>>({})

  const errorOf = (thread: string) =>
    ctx.wire.call(turnGet, { session: thread }).then(
      turn => [thread, turn?.error ?? 'Failed'] as const,
      () => [thread, 'Failed'] as const,
    )

  const failedOf = (bot: string) =>
    ctx.wire.call(threadList, { bot, limit: readLimit }).then(
      rows => Promise.all(rows.filter(row => failedStatuses.has(row.status)).map(row => errorOf(row.thread))),
      () => [],
    )

  const load = async () => {
    const bots = await ctx.wire.call(botList, {})
    names.set(Object.fromEntries(bots.map(bot => [bot.id, botName(bot)])))
    if (!starters.get()) return
    const found = await Promise.all(bots.map(bot => failedOf(bot.id)))
    failures.set(Object.fromEntries(found.flat()))
  }
  const reload = () => void load().catch(error => ctx.report(error))
  ctx.on(wireHello, reload)
  ctx.watch(botStarters, found => {
    starters.set(found)
    if (ctx.wire.ready()) reload()
  })
  ctx.effect(() => ctx.wire.on(botChangeWire, bot => names.update(current => ({ ...current, [bot.id]: botName(bot) }))))

  return {
    startsThreads: () => starters.get() !== undefined,
    startedBy: (bot: string) => starters.get()?.startedBy(bot) ?? [],
    name: (bot: string) => names.get()[bot] ?? 'Bot',
    failure: (thread: string) => failures.get()[thread],
  }
}

export type Roster = ReturnType<typeof createRoster>
