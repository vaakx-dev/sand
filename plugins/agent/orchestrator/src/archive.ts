import { sessionArchive } from '@sand/chats/contract'
import type { OrchestratorContext } from './context'
import { stopThread } from './stop'

export const archiveSubagents = (ctx: OrchestratorContext) =>
  ctx.on(sessionArchive, parent => {
    if (parent.archived === null) return
    for (const child of ctx.sessions.children(parent.id)) {
      if (child.archived !== null) continue
      const session = ctx.sessions.require(child.id)
      stopThread(ctx, session)
        .then(() => ctx.sessions.archive(child.id, true))
        .catch(error => ctx.report(error))
    }
  })
