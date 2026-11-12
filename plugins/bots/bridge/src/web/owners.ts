import { botName, type BotViews } from '@sand/bots/contract'
import { threadRoute, type ThreadOwner, type ThreadOwners } from '@sand/chat/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { Roster } from './roster'

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
  return { owner: thread => ownerOf(roster.starterOf(thread)) }
}
