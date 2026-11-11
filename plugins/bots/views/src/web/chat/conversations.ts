import { botPendingWire, botStreamWire, type BotSnapshot } from '@sand/bot-turns/contract'
import { botEntryWire, botRemoveWire, helloBots } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { deviceCache, type DeviceRecords } from '@sand/web-client/contract'
import { collectScope, disposeAll } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'
import { conversation, type Conversation } from './conversation'

interface Held {
  talk: Conversation
  stop(): void
}

export const conversations = (ctx: BotsContext) => {
  const held = new Map<string, Held>()
  let kept: DeviceRecords<BotSnapshot> | undefined
  ctx.watch(deviceCache, found => {
    kept = found?.records<BotSnapshot>('bot-chats')
  })

  const get = (bot: string) => {
    const found = held.get(bot)
    if (found) return found.talk
    const { value: talk, scope } = collectScope(() => conversation(ctx, bot, () => kept))
    held.set(bot, { talk, stop: () => disposeAll(scope) })
    void talk.load()
    return talk
  }

  const talking = (bot: string) => held.get(bot)?.talk

  const forget = (bot: string) => {
    held.get(bot)?.stop()
    held.delete(bot)
    kept?.remove(bot)
  }

  const caughtUp = () => {
    const listed = new Set((ctx.wire.hello(helloBots) ?? []).map(bot => bot.id))
    for (const bot of held.keys()) if (!listed.has(bot)) forget(bot)
    for (const bot of listed) {
      const talk = talking(bot)
      if (talk) void talk.sync()
      else get(bot)
    }
  }

  ctx.effect(() =>
    joinDisposers(
      ctx.wire.on(botEntryWire, entry => talking(entry.bot)?.arrived(entry)),
      ctx.wire.on(botPendingWire, ([bot, items]) => talking(bot)?.queue(items)),
      ctx.wire.on(botStreamWire, ([bot, event]) => talking(bot)?.stream(event)),
      ctx.wire.on(botRemoveWire, forget),
      () => {
        for (const { stop } of held.values()) stop()
      },
    ),
  )
  ctx.on(wireHello, caughtUp)
  if (ctx.wire.ready()) caughtUp()

  return { get }
}

export type Conversations = ReturnType<typeof conversations>
