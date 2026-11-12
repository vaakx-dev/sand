import { promptContent, userParts, type Entry } from '@sand/chats/contract'
import type { Item, Row, Rows, TranscriptParts } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div } from '@vaakx-dev/vrui'
import { sendingCaption, type Sending } from '@sand/composer/contract'
import type { Conversation, Pending } from './conversation'

const shown = new Set<Item['kind']>(['user', 'text', 'notice', 'custom'])

const dayMs = 24 * 60 * 60 * 1000

const dayLabel = (at: number) => {
  const date = new Date(at)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === new Date(today.getTime() - dayMs).toDateString()) return 'Yesterday'
  const year = date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year })
}

const timeOf = (item: Item) => ('at' in item ? item.at : undefined)

const promptItems = (parts: TranscriptParts, bot: string, { id, prompt, at }: Pending) => {
  const entry: Entry = { id, session: bot, parent: null, at, type: 'message', data: null, seq: 0 }
  return parts.prompt(entry, userParts({ role: 'user', content: promptContent(prompt) }))
}

const dayRow = (kit: Kit, label: string): Row => ({
  key: `day:${label}`,
  data: label,
  view: () => div({ class: 'flex justify-center py-3' }, kit.metaLine(label)),
})

const withDays = (kit: Kit, rows: Rows, items: Item[]) => {
  const days = items.map(item => {
    const at = timeOf(item)
    return at === undefined ? undefined : dayLabel(at)
  })
  const onlyToday = days.every(label => label === undefined || label === 'Today')
  let day: string | undefined
  return items.flatMap((item, index) => {
    const label = days[index]
    const fresh = !onlyToday && label !== undefined && label !== day
    if (label !== undefined) day = label
    return fresh ? [dayRow(kit, label), ...rows.item(item)] : rows.item(item)
  })
}

interface ChatRowsParts {
  kit: Kit
  parts: TranscriptParts
  rows: Rows
  talk: Conversation
  working(): boolean
  sending(): Sending | undefined
}

const sendingRows = ({ kit, parts, rows, talk }: ChatRowsParts, sending: Sending | undefined) => {
  if (!sending) return []
  const caption = sendingCaption(sending)
  const shown = (item: Item) =>
    item.kind === 'user' ? [rows.user({ ...item, key: `${sending.id}:${caption}` }, () => [], () => kit.metaLine(caption))] : rows.item(item)
  return promptItems(parts, talk.bot, sending).flatMap(shown)
}

export const chatRows = (chat: ChatRowsParts) => {
  const { kit, parts, rows, talk, working, sending } = chat
  const { bot } = talk
  const settled = derive(() => {
    parts.version.get()
    return parts.settled({ id: bot }, talk.path.get())
  })
  return derive(() => {
    const said = parts.items(settled.get(), { id: bot, live: talk.live.get(), running: working() })
    const asked = talk.pending.get().flatMap(pending => promptItems(parts, bot, pending))
    return [...withDays(kit, rows, [...said, ...asked].filter(item => shown.has(item.kind))), ...sendingRows(chat, sending())]
  })
}
