import { sessionArchive } from '@sand/chats/contract'
import type { SendAway } from './away'
import type { OrchestratorContext } from './context'
import type { Starters } from './starters'
import { stopThread } from './stop'

export const archiveSubagents = (ctx: OrchestratorContext, starters: Starters, sendAway: SendAway) =>
  ctx.on(sessionArchive, parent => {
    if (parent.archived === null) return
    for (const child of ctx.sessions.children(parent.id)) {
      if (child.archived !== null) continue
      const session = ctx.sessions.require(child.id)
      stopThread(ctx, session)
        .then(() => ctx.sessions.archive(child.id, true))
        .catch(error => ctx.report(error))
    }
    for (const { thread, pc } of starters.elsewhere(parent.id)) sendAway({ thread, pc, errand: 'archive' }).catch(error => ctx.report(error))
  })
