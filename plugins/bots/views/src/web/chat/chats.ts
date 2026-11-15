import { threadChange } from '@sand/web-client/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'

export const botChats = (ctx: BotsContext) => {
  const versions = new Map<string, Sig<number>>()
  ctx.on(threadChange, id => versions.get(id)?.update(version => version + 1))

  const versionOf = (bot: string) => {
    const found = versions.get(bot)
    if (found) return found
    const fresh = sig(0)
    versions.set(bot, fresh)
    return fresh
  }

  return {
    thread(bot: string) {
      versionOf(bot).get()
      return ctx.threads.get(bot)
    },
    path(bot: string) {
      versionOf(bot).get()
      return ctx.threads.path(bot)
    },
  }
}
