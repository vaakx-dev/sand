import { type Conversation, engine, type Owner } from '@sand/engine/contract'
import type { ThreadsContext } from './context'
import { type Path, pathOf } from './view/path'
import { producers, type TurnModel } from './view/producers'

const turnModelOf = (ctx: ThreadsContext, owner: Owner): TurnModel => {
  const found = new Map<string, string | undefined>()
  return turn => {
    if (!found.has(turn)) found.set(turn, ctx.get(engine)?.turn(owner, turn)?.selection.model)
    return found.get(turn)
  }
}

export const currentPath = (ctx: ThreadsContext, conversation: Conversation) => pathOf(conversation.path(), ctx.entryViews)

export const madeBy = (ctx: ThreadsContext, path: Path, owner: Owner) => producers(path, turnModelOf(ctx, owner))
