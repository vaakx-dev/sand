import type { Session } from '@sand/chats/contract'
import { turns } from '@sand/turns-contract/contract'
import type { ThreadsContext } from './context'
import { type Path, pathOf } from './view/path'
import { producers, type TurnModel } from './view/producers'

const turnModelOf = (ctx: ThreadsContext): TurnModel => {
  const found = new Map<string, string | undefined>()
  return turn => {
    if (!found.has(turn)) found.set(turn, ctx.get(turns)?.get(turn)?.selection.model)
    return found.get(turn)
  }
}

export const currentPath = (ctx: ThreadsContext, session: Session) => pathOf(session.path(), ctx.entryViews)

export const madeBy = (ctx: ThreadsContext, path: Path) => producers(path, turnModelOf(ctx))
