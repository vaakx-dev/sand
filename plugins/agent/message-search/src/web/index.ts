import { botRoster, botRoute } from '@sand/bots/contract'
import { threadView } from '@sand/chat/contract'
import { pcs, wire } from '@sand/devices-contract'
import { palette, type Palette } from '@sand/palette/contract'
import { shownChats } from '@sand/transcript/contract'
import { shell } from '@sand/ui-shell/contract'
import { searchWords } from '@sand/util'
import { definePlugin } from 'drydock'
import type { Indexing } from '../contract'
import { messageRows } from './rows'
import { MessageSearch, type PcHit } from './search'

const indexingNote = ({ done, total }: Indexing) => `Indexing messages… ${Math.floor((done / total) * 100)}%`

export default definePlugin({
  name: 'message-search-web',
  description: 'Search lists the messages that hold the words you type, from every PC, and opens the chat at the message',
  inject: { wire, pcs, shell, threadView, shownChats },
  apply(ctx) {
    const search = new MessageSearch(ctx)

    const openChat = ({ owner, chat }: PcHit) => {
      if (owner === 'thread') return ctx.threadView.open(chat)
      ctx.shell.open({ kind: botRoute, id: chat, tab: 'chat' })
    }

    const open = (hit: PcHit, words: string[]) => {
      openChat(hit)
      void ctx.shownChats.show({ conversation: hit.chat, entry: hit.entry, block: hit.block, words })
    }

    const rowsFor = async (found: Palette, query: string) => {
      const words = searchWords(query)
      const { hits, indexing } = await search.search(query)
      const parts = { used: found.used, tint: (bot: string) => ctx.get(botRoster)?.find(bot)?.color, open: (hit: PcHit) => open(hit, words) }
      return { items: messageRows(parts, hits), ...(indexing && { note: indexingNote(indexing) }) }
    }

    ctx.watch(palette, found =>
      found?.later({
        id: 'messages',
        group: 'In messages',
        waiting: 'Searching messages…',
        items: query => rowsFor(found, query),
      }),
    )
  },
})
