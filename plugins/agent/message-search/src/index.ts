import { botEntry, botName, botRemove, bots } from '@sand/bots/contract'
import { sessionEntry, sessionRemove, sessions } from '@sand/chats/contract'
import { ledger } from '@sand/ledger/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { messagesSearch } from './contract'
import { Keeper } from './keeper'
import { type Chats, searchMessages } from './search'
import { Store } from './store'
import { offerSearchTool } from './tools'

export default definePlugin({
  name: 'message-search',
  description: 'Keeps an index of the words said in threads and bots in sand.db, current as messages arrive, so Search, agents and the sand search command find messages fast',
  inject: { ledger, sessions },
  apply(ctx) {
    const store = new Store(ctx.ledger)
    const keeper = new Keeper(store, error => ctx.report(error))

    const botTitle = (id: string) => {
      const bot = ctx.get(bots)?.get(id)
      return bot && botName(bot)
    }

    const chats: Chats = {
      tracks: owner => owner === 'thread' || ctx.get(bots) !== undefined,
      title: (owner, id) => (owner === 'thread' ? ctx.sessions.open(id)?.title : botTitle(id)),
    }

    ctx.effect(() => () => keeper.stop())
    ctx.watch(bots, () => keeper.refresh())
    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'message' && session.kind !== 'agent') keeper.refresh()
    })
    ctx.on(botEntry, entry => {
      if (entry.type === 'message') keeper.refresh()
    })
    ctx.on(sessionRemove, id => store.drop('thread', id))
    ctx.on(botRemove, id => store.drop('bot', id))
    ctx.watch(mcpTools, found => found && offerSearchTool(found))
    ctx.watch(
      server,
      found =>
        found?.handle(messagesSearch, search => {
          keeper.refresh()
          return { chats: searchMessages(store, chats, search), ...keeper.progress() }
        }),
    )
  },
})
