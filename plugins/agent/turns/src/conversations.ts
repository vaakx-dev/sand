import { llmEvent } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
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

export const threadTurn = ({ owner, conversation, ...info }: EngineTurn): TurnInfo => ({ ...info, session: conversation })

export const threadConversations = (ctx: TurnsContext): Conversations<Session> => {
  const unseen = (session: Session) => {
    if (session.kind !== 'agent') ctx.sessions.update(session.id, { seen: false })
  }

  return {
    owner: 'thread',
    open: id => ctx.sessions.open(id),
    select: session => ctx.modelSettings.select(session),
    step: (session, turn, signal) => ctx.providerThreads.step(session, turn, signal),
    abandon: thread => ctx.providerThreads.abandon(thread),
    prompt: (content, session) => ctx.waterfall(turnPrompt, content, session),
    ready: (prompt, session, signal) => ctx.waterfall(turnReady, prompt, session, signal),
    overflow: (session, turn, error, signal) => ctx.bail(contextOverflow, session, turn, error, signal),
    started: (session, prompt, info) => ctx.emit(turnStart, session, prompt, threadTurn(info)),
    ended(session, result, info) {
      unseen(session)
      ctx.emit(turnEnd, session, result, threadTurn(info))
    },
    lost: unseen,
    changed: info => ctx.emit(turnChange, threadTurn(info)),
    queued: session => ctx.emit(turnPending, session),
    streamed: (event, session) => ctx.emit(llmEvent, event, session),
    toolStarted: (call, session) => ctx.emit(toolStart, call, session),
    toolProgress: (call, text, session) => ctx.emit(toolProgress, call, text, session),
    toolDone: (result, call, session) => ctx.waterfall(toolResult, result, call, session),
  }
}
