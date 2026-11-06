import { botStartedWire, botStarts } from '@sand/bot-bridge/contract'
import { botChangeWire, botList, botName } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { readLimit, threadList } from '@sand/orchestrator/contract'
import { turnGet } from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'

const failedStatuses = new Set<string>(['failed', 'lost'])

export const createRoster = (ctx: WorkContext) => {
  const starts = sig<Record<string, string>>({})
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

  const loadFailures = async (started: Record<string, string>) => {
    const found = await Promise.all([...new Set(Object.values(started))].map(failedOf))
    failures.set(Object.fromEntries(found.flat()))
  }

  const load = () =>
    Promise.all([ctx.wire.call(botStarts, {}), ctx.wire.call(botList, {})]).then(([started, bots]) => {
      starts.set(started)
      names.set(Object.fromEntries(bots.map(bot => [bot.id, botName(bot)])))
      return loadFailures(started)
    }, error => ctx.report(error))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()
  ctx.effect(() =>
    joinDisposers(
      ctx.wire.on(botStartedWire, ([thread, bot]) => starts.update(current => ({ ...current, [thread]: bot }))),
      ctx.wire.on(botChangeWire, bot => names.update(current => ({ ...current, [bot.id]: botName(bot) }))),
    ),
  )

  return {
    startedBy: (bot: string) => Object.entries(starts.get()).flatMap(([thread, starter]) => (starter === bot ? [thread] : [])),
    name: (bot: string) => names.get()[bot] ?? 'Bot',
    failure: (thread: string) => failures.get()[thread],
  }
}

export type Roster = ReturnType<typeof createRoster>
