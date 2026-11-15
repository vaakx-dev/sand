import { botName } from '@sand/bots/contract'
import type { ThreadOwner, ThreadOwners } from '@sand/chat/contract'
import type { Roster } from './roster'

export const threadOwnersOf = (roster: Roster): ThreadOwners => {
  const ownerOf = (bot: string | undefined): ThreadOwner | undefined => {
    const found = bot === undefined ? undefined : roster.find(bot)
    return found && { id: found.id, label: botName(found), color: found.color }
  }
  return { owner: thread => ownerOf(roster.starterOf(thread)) }
}
