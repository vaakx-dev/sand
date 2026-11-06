import type { BotEntry, Bots } from '@sand/bots/contract'
import type { Entry } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'

const entryOf = ({ bot, ...entry }: BotEntry, parent: string | null): Entry => ({ ...entry, session: bot, parent })

const chained = (entries: BotEntry[]) => entries.map((entry, at) => entryOf(entry, entries[at - 1]?.id ?? null))

export const conversationOf = (bots: Bots, id: string): Conversation => {
  const conversation = bots.conversation(id)
  const path = () => chained(conversation.entries())
  return {
    id,
    owner: 'bot',
    cwd: bots.folder(id),
    append: (type, data, meta) => entryOf(conversation.append(type, data, meta), null),
    path,
    entries: path,
  }
}
