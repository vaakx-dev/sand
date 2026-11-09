import { type Message, type Session, textOf } from '@sand/chats/contract'
import { turnChange, turnPending, type TurnInfo, type WaitUntil } from '@sand/turns-contract/contract'
import type { OrchestratorContext } from './context'
import { settled, type ThreadState, type ThreadStatus } from './contract'

const latestTurn = (ctx: OrchestratorContext, session: Session) => ctx.turns.current(session) ?? ctx.turns.list(session, undefined, 1)[0]

const queued = (ctx: OrchestratorContext, session: Session) => !ctx.turns.current(session) && ctx.turns.pending(session).some(item => !item.held)

const statusOf = (ctx: OrchestratorContext, session: Session, turn: TurnInfo | undefined): ThreadStatus =>
  queued(ctx, session) ? 'running' : (turn?.status ?? 'idle')

const replyOf = (session: Session, turn: string) => {
  const entry = session.latest('message')
  if (entry?.turn !== turn) return undefined
  const message = entry.data as Message
  return message.role === 'assistant' ? textOf(message.content) : undefined
}

export const threadStatus = (ctx: OrchestratorContext, session: Session) => statusOf(ctx, session, latestTurn(ctx, session))

export const threadState = (ctx: OrchestratorContext, session: Session): ThreadState => {
  const turn = latestTurn(ctx, session)
  const reply = turn && replyOf(session, turn.id)
  return {
    thread: session.id,
    ...(turn && { turn: turn.id }),
    status: statusOf(ctx, session, turn),
    ...(turn?.waiting && { waiting: turn.waiting }),
    ...(reply && { reply }),
    ...(turn?.error && { error: turn.error }),
  }
}

const userWrote = (ctx: OrchestratorContext, waiter: Session | undefined) =>
  Boolean(waiter && ctx.turns.pending(waiter).some(item => item.kind === 'steer' && item.origin === 'user'))

export const waitThread = (ctx: OrchestratorContext, session: Session, until: WaitUntil, signal: AbortSignal, waiter?: Session) =>
  new Promise<ThreadState>(resolve => {
    const check = () => {
      const done = settled(threadStatus(ctx, session), until)
      const wrote = !done && userWrote(ctx, waiter)
      if (!done && !wrote && !signal.aborted) return
      stop()
      resolve({ ...threadState(ctx, session), ...(wrote && { userWrote: true }) })
    }
    const stops = [
      ctx.on(turnChange, info => void (info.session === session.id && check())),
      ctx.on(turnPending, changed => void ((changed.id === session.id || changed.id === waiter?.id) && check())),
    ]
    const stop = () => {
      for (const dispose of stops) void dispose()
      signal.removeEventListener('abort', check)
    }
    signal.addEventListener('abort', check)
    check()
  })
