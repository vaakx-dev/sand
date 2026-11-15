import { botChange, bots, gistEntry, type GistEntry } from '@sand/bots/contract'
import { type Message, sessions } from '@sand/chats/contract'
import { subModel } from '@sand/sub-model/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { askGist } from './ask'

const deadline = 20_000

export default definePlugin({
  name: 'bot-gist',
  description: "Sums up each finished bot reply in one line with the fast sub model and keeps it in the bot's chat",
  inject: { bots, sessions },
  apply(ctx) {
    const unloaded = new AbortController()
    ctx.effect(() => () => unloaded.abort())
    const asked = new Set<string>()

    const sum = async (bot: string, entry: string, signal: AbortSignal) => {
      const sub = ctx.get(subModel)
      const chat = ctx.sessions.require(bot)
      const reply = chat.entry(entry)?.data as Message | undefined
      if (!sub?.has('fast') || !reply) return
      const text = await askGist(sub, { bot, reply, signal })
      chat.append(gistEntry, { entry, text } satisfies GistEntry)
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
