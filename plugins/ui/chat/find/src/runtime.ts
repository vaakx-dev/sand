import { bots, chatPath } from '@sand/bots/contract'
import { type Entry, sessions } from '@sand/chats/contract'
import type { InputOf } from '@sand/host-hub/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { chatFind } from './contract'
import { blockCounts } from './counts'

type Find = InputOf<typeof chatFind>

const olderThan = (entries: Entry[], before?: string) => {
  const end = before === undefined ? entries.length : entries.findIndex(entry => entry.id === before)
  return end < 0 ? [] : entries.slice(0, end)
}

export default definePlugin({
  name: 'chat-find',
  description: "Counts where words appear in a thread's or bot's history older than what a page has loaded, without sending the messages",
  inject: { sessions },
  apply(ctx) {
    const botHistory = (bot: string) => {
      const found = ctx.get(bots)
      return found?.get(bot) ? chatPath(found.conversation(bot).entries()) : []
    }

    const history = ({ owner, chat }: Find) => (owner === 'thread' ? (ctx.sessions.open(chat)?.path() ?? []) : botHistory(chat))

    const find = (input: Find) => blockCounts(olderThan(history(input), input.before), input.query)

    ctx.watch(server, found => found?.handle(chatFind, find))
  },
})
