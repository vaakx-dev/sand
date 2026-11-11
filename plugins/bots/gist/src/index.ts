import { botChange, bots, gistEntry, type GistEntry } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { subModel } from '@sand/sub-model/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { askGist } from './ask'

const deadline = 20_000
const scanned = 20

export default definePlugin({
  name: 'bot-gist',
  description: "Sums up each finished bot reply in one line with the fast sub model and keeps it in the bot's conversation",
  inject: { bots },
  apply(ctx) {
    const unloaded = new AbortController()
    ctx.effect(() => () => unloaded.abort())
    const asked = new Set<string>()

    const replyOf = (bot: string, entry: string) =>
      ctx.bots.conversation(bot).page(undefined, scanned).entries.find(found => found.id === entry)?.data as Message | undefined

    const sum = async (bot: string, entry: string, signal: AbortSignal) => {
      const sub = ctx.get(subModel)
      const reply = replyOf(bot, entry)
      if (!sub?.has('fast') || !reply) return
      const text = await askGist(sub, { bot, reply, signal })
      ctx.bots.conversation(bot).append(gistEntry, { entry, text } satisfies GistEntry)
    }

    ctx.on(botChange, bot => {
      const last = bot.last
      if (bot.status !== 'idle' || last?.role !== 'assistant' || last.gist || asked.has(last.entry)) return
      const entry = last.entry
      asked.add(entry)
      const signal = AbortSignal.any([unloaded.signal, AbortSignal.timeout(deadline)])
      sum(bot.id, entry, signal).catch(error => {
        if (!unloaded.signal.aborted) ctx.report(new Error(`Kept the cut reply line of bot ${bot.id}: ${errorMessage(error)}`))
      })
    })
  },
})
