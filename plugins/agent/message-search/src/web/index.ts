import { botRoster, botRoute } from '@sand/bots/contract'
import { threadView } from '@sand/chat/contract'
import { pcs, wire } from '@sand/devices-contract'
import { palette, type Palette, type PalettePage } from '@sand/palette/contract'
import { shownChats } from '@sand/transcript/contract'
import { shell } from '@sand/ui-shell/contract'
import { searchWords } from '@sand/util'
import { definePlugin } from 'drydock'
import type { Indexing, MessageHit } from '../contract'
import { chatMatchRows, messageRows, type RowParts } from './rows'
import { MessageSearch, type PcChat } from './search'

const TYPING_DELAY_MS = 150

const indexingNote = ({ done, total }: Indexing) => `Indexing messages… ${Math.floor((done / total) * 100)}%`

export default definePlugin({
  name: 'message-search-web',
  description: 'Search lists the messages that hold the words you type, from every PC, and opens the chat at the message',
  inject: { wire, pcs, shell, threadView, shownChats },
  apply(ctx) {
    const search = new MessageSearch(ctx)

    const openChat = ({ owner, chat }: PcChat) => {
      if (owner === 'thread') return ctx.threadView.open(chat)
      ctx.shell.open({ kind: botRoute, id: chat, tab: 'chat' })
    }

    const open = (chat: PcChat, { entry, block }: MessageHit, query: string) => {
      openChat(chat)
      void ctx.shownChats.show({ conversation: chat.chat, entry, block, words: searchWords(query) })
    }

    const partsFor = (found: Palette, query: string): RowParts => ({
      used: found.used,
      tint: bot => ctx.get(botRoster)?.find(bot)?.color,
      open: (chat, hit) => open(chat, hit, query),
      more: chat => matchesPage(found, chat, query),
    })

    const matchRowsFor = async (found: Palette, chat: PcChat, query: string) => chatMatchRows(partsFor(found, query), chat, await search.inChat(chat, query))

    const matchesPage = (found: Palette, chat: PcChat, query: string): PalettePage => ({
      id: `messages:${chat.pc}:${chat.owner}:${chat.chat}`,
      title: chat.title,
      placeholder: `Search in ${chat.title}`,
      filter: false,
      delay: TYPING_DELAY_MS,
      items: typed => matchRowsFor(found, chat, typed.trim() || query),
    })

    const rowsFor = async (found: Palette, query: string) => {
      const { chats, indexing } = await search.search(query)
      return { items: messageRows(partsFor(found, query), chats), ...(indexing && { note: indexingNote(indexing) }) }
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
