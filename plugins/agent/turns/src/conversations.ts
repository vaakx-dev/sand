import { llmEvent } from '@sand/accounts/contract'
import type { Owner, Session } from '@sand/chats/contract'
import type { Conversations, TurnInfo as EngineTurn } from '@sand/engine/contract'
import { contextOverflow } from '@sand/provider-threads/contract'
import {
  toolProgress,
  toolResult,
  toolStart,
  turnChange,
  turnEnd,
  type TurnInfo,
  turnPending,
  turnPrompt,
  turnReady,
  turnStart,
} from '@sand/turns-contract/contract'
import type { TurnsContext } from './context'

export const turnOf = ({ owner, conversation, ...info }: EngineTurn): TurnInfo => ({ ...info, session: conversation })

export const sessionConversations = (ctx: TurnsContext, owner: Owner, queues: () => boolean): Conversations<Session> => {
  const unseen = (session: Session) => {
    ctx.sessions.update(session.id, { seen: false })
  }

  const reopen = (session: Session) => {
    if (session.archived !== null) ctx.sessions.update(session.id, { archived: null })
  }

  const open = (id: string) => {
    const session = ctx.sessions.open(id)
    return session?.owner === owner ? session : undefined
  }

  return {
    owner,
    open,
    select: session => ctx.modelSettings.select(session),
    step: (session, turn, signal) => ctx.providerThreads.step(session, turn, signal),
    abandon: thread => ctx.providerThreads.abandon(thread),
    prompt(content, session) {
      reopen(session)
      return ctx.waterfall(turnPrompt, content, session)
    },
    ready: (prompt, session, signal) => ctx.waterfall(turnReady, prompt, session, signal),
    overflow: (session, turn, error, signal) => ctx.bail(contextOverflow, session, turn, error, signal),
    started(session, prompt, info) {
      if (info.origin === 'user') ctx.sessions.update(session.id, { talked: info.started })
      ctx.emit(turnStart, session, prompt, turnOf(info))
    },
    ended(session, result, info) {
      unseen(session)
      ctx.emit(turnEnd, session, result, turnOf(info))
    },
    lost: unseen,
    changed: info => ctx.emit(turnChange, turnOf(info)),
    queued: session => ctx.emit(turnPending, session),
    queues,
    streamed: (event, session) => ctx.emit(llmEvent, event, session),
    toolStarted: (call, session) => ctx.emit(toolStart, call, session),
    toolProgress: (call, text, session) => ctx.emit(toolProgress, call, text, session),
    toolDone: (result, call, session) => ctx.waterfall(toolResult, result, call, session),
  }
}
