import { botName, type BotViews } from '@sand/bots/contract'
import type { ThreadOwner, ThreadOwners } from '@sand/chat/contract'
import type { Entry, Message } from '@sand/chats/contract'
import { botKind } from '../contract'
import { threadRef } from './refs'
import type { Roster } from './roster'

const senderOf = (entry: Entry) => {
  if (entry.type !== 'message') return undefined
  const { role, content } = entry.data as Message
  if (role !== 'user') return undefined
  const record = content.flatMap(block => (block.type === 'context' ? block.records : [])).find(found => found.kind === botKind && found.data.sent === true)
  return typeof record?.data.id === 'string' ? record.data.id : undefined
}

export const threadOwnersOf = (roster: Roster, views: BotViews): ThreadOwners => {
  const ownerOf = (bot: string | undefined): ThreadOwner | undefined => {
    const found = bot === undefined ? undefined : roster.find(bot)
    if (!found) return undefined
    return { id: found.id, label: botName(found), initial: found.initial, color: found.color, open: thread => views.open(found.id, threadRef(thread)) }
  }
  return {
    owner: thread => ownerOf(roster.starterOf(thread)),
    sender: (_thread, entry) => ownerOf(senderOf(entry)),
  }
}
