import { promptContent, userParts, type Entry } from '@sand/chats/contract'
import type { Item, Row, Rows, TranscriptParts } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dayLabel } from '@sand/util'
import { derive, div } from '@vaakx-dev/vrui'
import type { Sending } from '@sand/composer/contract'
import type { Conversation, Pending } from './conversation'

const shown = new Set<Item['kind']>(['user', 'text', 'notice', 'custom'])

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
  sending(): Sending[]
}

const sendingRows = ({ kit, parts, rows, talk }: ChatRowsParts, sending: Sending) => {
  const shown = (item: Item) =>
    item.kind === 'user'
      ? [rows.user({ ...item, key: `${sending.id}:${sending.failed}` }, () => sending.actions, () => kit.metaLine(sending.caption))]
      : rows.item(item)
  return promptItems(parts, talk.bot, sending).flatMap(shown)
}

export const chatRows = (chat: ChatRowsParts) => {
  const { kit, parts, rows, talk, working, sending } = chat
  const { bot } = talk
  const settled = derive(() => {
    parts.version.get()
    return parts.settled({ id: bot }, talk.path.get())
  })
  const items = derive(() => {
    const said = parts.items(settled.get(), { id: bot, live: talk.live.get(), running: working() })
    const asked = talk.pending.get().flatMap(pending => promptItems(parts, bot, pending))
    return [...said, ...asked].filter(item => shown.has(item.kind))
  })
  return { items, rows: derive(() => [...withDays(kit, rows, items.get()), ...sending().flatMap(found => sendingRows(chat, found))]) }
}
