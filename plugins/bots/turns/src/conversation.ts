import { type Bots, chatEntry, chatPath } from '@sand/bots/contract'
import type { Conversation } from '@sand/engine/contract'

export const conversationOf = (bots: Bots, id: string): Conversation => {
  const conversation = bots.conversation(id)
  const path = () => chatPath(conversation.entries())
  return {
    id,
    owner: 'bot',
    cwd: bots.folder(id),
    append: (type, data, meta) => chatEntry(conversation.append(type, data, meta), null),
    path,
    entries: path,
  }
}
