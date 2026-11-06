import { routineRecord } from '@sand/bot-routines/contract'
import { promptContent, userParts, type ContextRecord, type Entry } from '@sand/chats/contract'
import type { Item, Row, Rows, TranscriptParts, UserItem } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, span } from '@vaakx-dev/vrui'
import type { Conversation, Pending } from './conversation'

const shown = new Set<Item['kind']>(['user', 'text', 'notice', 'custom'])

const routineOf = (item: UserItem) => item.parts.flatMap(part => (part.kind === 'context' ? part.records : [])).find(record => record.kind === routineRecord)

const routineRow = (kit: Kit, item: UserItem, routine: ContextRecord): Row => ({
  key: `routine:${item.key}`,
  data: item,
  view: () => div(kit.markerLine({ icon: 'clock' }, span({ class: 'min-w-0 truncate' }, `${routine.data.repeats === true ? 'Routine' : 'Reminder'} · ${routine.label}`))),
})

const promptItems = (parts: TranscriptParts, bot: string, { id, prompt, at }: Pending) => {
  const entry: Entry = { id, session: bot, parent: null, at, type: 'message', data: null, seq: 0 }
  return parts.prompt(entry, userParts({ role: 'user', content: promptContent(prompt) }))
}

const rowsOf = (kit: Kit, rows: Rows, item: Item) => {
  if (item.kind !== 'user') return rows.item(item)
  const routine = routineOf(item)
  return routine ? [routineRow(kit, item, routine)] : rows.item(item)
}

export const transcriptRows = (kit: Kit, parts: TranscriptParts, rows: Rows, talk: Conversation, working: () => boolean) => {
  const { bot } = talk
  const settled = derive(() => parts.settled({ id: bot }, talk.path.get()))
  return derive(() => {
    const said = parts.items(settled.get(), { id: bot, live: talk.live.get(), running: working() })
    const asked = talk.pending.get().flatMap(pending => promptItems(parts, bot, pending))
    return [...said, ...asked].filter(item => shown.has(item.kind)).flatMap(item => rowsOf(kit, rows, item))
  })
}
