import { botRoute } from '@sand/bots/contract'
import { threadRoute } from '@sand/chat/contract'
import { visitsOf, type PaletteItem, type PalettePage } from '@sand/palette/contract'
import type { Route } from '@sand/ui-shell/contract'
import { ago } from '@sand/util'
import { fits, type MessageHit } from '../contract'
import type { PcChat } from './search'

export interface RowParts {
  used(visits: string): number
  tint(bot: string): string | undefined
  open(chat: PcChat, hit: MessageHit): void
  more(chat: PcChat): PalettePage
}

const USE_WEIGHT = 0.2
const MOST_CHATS = 10

const routeOf = ({ owner, chat }: PcChat): Route => ({ kind: owner === 'bot' ? botRoute : threadRoute, id: chat })

const fitOrder = ({ fit }: PcChat) => fits.indexOf(fit)

const lead = (parts: RowParts, chat: PcChat): Pick<PaletteItem, 'face' | 'icon'> => {
  const tint = chat.owner === 'bot' ? parts.tint(chat.chat) : undefined
  return tint ? { face: { id: chat.chat, tint } } : { icon: 'message' }
}

const hitId = (chat: PcChat, hit: MessageHit) => `message:${chat.pc}:${chat.owner}:${hit.entry}:${hit.block}`

const chatRow = (parts: RowParts, chat: PcChat, hit: MessageHit): PaletteItem => ({
  id: hitId(chat, hit),
  label: chat.title,
  excerpt: hit.excerpt,
  meta: ago(hit.at),
  visits: visitsOf(routeOf(chat)),
  ...lead(parts, chat),
  run: () => parts.open(chat, hit),
})

const matchRow = (parts: RowParts, chat: PcChat, hit: MessageHit): PaletteItem => ({
  id: hitId(chat, hit),
  label: hit.excerpt.text,
  excerpt: hit.excerpt,
  nested: true,
  visits: visitsOf(routeOf(chat)),
  run: () => parts.open(chat, hit),
})

const moreRow = (parts: RowParts, chat: PcChat, more: number): PaletteItem => ({
  id: `message-more:${chat.pc}:${chat.owner}:${chat.chat}`,
  label: `${more} more`,
  nested: true,
  page: () => parts.more(chat),
})

const chatRows = (parts: RowParts, chat: PcChat) => {
  const [best, ...rest] = chat.hits
  if (!best) return []
  const more = chat.matches - chat.hits.length
  return [chatRow(parts, chat, best), ...rest.map(hit => matchRow(parts, chat, hit)), ...(more > 0 ? [moreRow(parts, chat, more)] : [])]
}

const rankOf = (parts: RowParts, chat: PcChat) => chat.weight + parts.used(visitsOf(routeOf(chat))) * USE_WEIGHT

const messageRows = (parts: RowParts, chats: PcChat[]) =>
  chats
    .map(chat => ({ chat, rank: rankOf(parts, chat) }))
    .toSorted((a, b) => fitOrder(a.chat) - fitOrder(b.chat) || b.rank - a.rank)
    .slice(0, MOST_CHATS)
    .flatMap(({ chat }) => chatRows(parts, chat))

const chatMatchRows = (parts: RowParts, chat: PcChat, hits: MessageHit[]) => hits.map(hit => ({ ...matchRow(parts, chat, hit), meta: ago(hit.at) }))

export { chatMatchRows, messageRows }
