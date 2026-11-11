import { botName, type BotViews } from '@sand/bots/contract'
import { threadRoute, type ThreadOwner, type ThreadOwners } from '@sand/chat/contract'
import type { Entry, Message } from '@sand/chats/contract'
import type { Shell } from '@sand/ui-shell/contract'
import { botKind } from '../contract'
import type { Roster } from './roster'

const senderOf = (entry: Entry) => {
  if (entry.type !== 'message') return undefined
  const { role, content } = entry.data as Message
  if (role !== 'user') return undefined
  const record = content.flatMap(block => (block.type === 'context' ? block.records : [])).find(found => found.kind === botKind && found.data.sent === true)
  return typeof record?.data.id === 'string' ? record.data.id : undefined
}

export const threadOwnersOf = (roster: Roster, views: BotViews, shell?: Shell): ThreadOwners => {
  const ownerOf = (bot: string | undefined): ThreadOwner | undefined => {
    const found = bot === undefined ? undefined : roster.find(bot)
    if (!found) return undefined
    return {
      id: found.id,
      label: botName(found),
      color: found.color,
      open: thread => {
        if (shell) shell.open({ kind: threadRoute, id: thread })
        else views.open(found.id)
      },
    }
  }
  return {
    owner: thread => ownerOf(roster.starterOf(thread)),
    sender: (_thread, entry) => ownerOf(senderOf(entry)),
  }
}
