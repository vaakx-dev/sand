import { promptContent, userParts, type Entry } from '@sand/chats/contract'
import type { Item, Rows, TranscriptParts } from '@sand/transcript/contract'
import { derive } from '@vaakx-dev/vrui'
import type { Conversation, Pending } from './conversation'

const shown = new Set<Item['kind']>(['user', 'text', 'notice', 'custom'])

const promptItems = (parts: TranscriptParts, bot: string, { id, prompt, at }: Pending) => {
  const entry: Entry = { id, session: bot, parent: null, at, type: 'message', data: null, seq: 0 }
  return parts.prompt(entry, userParts({ role: 'user', content: promptContent(prompt) }))
}

export const transcriptRows = (parts: TranscriptParts, rows: Rows, talk: Conversation, working: () => boolean) => {
  const { bot } = talk
  const settled = derive(() => parts.settled({ id: bot }, talk.path.get()))
  return derive(() => {
    const said = parts.items(settled.get(), { id: bot, live: talk.live.get(), running: working() })
    const asked = talk.pending.get().flatMap(pending => promptItems(parts, bot, pending))
    return [...said, ...asked].filter(item => shown.has(item.kind)).flatMap(item => rows.item(item))
  })
}
