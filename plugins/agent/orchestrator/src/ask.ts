import { notificationText, threadLinkNote } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import type { OrchestratorContext } from './context'
import { failure, threadReported } from './contract'
import { findThread } from './find'
import type { Outbox } from './outbox'
import type { Owners } from './owners'
import type { Starters } from './starters'

interface Asking {
  starters: Starters
  owners: Owners
  outbox: Outbox
}

const howToAnswer =
  "Your subagent is waiting for this answer. Reply with answer_agent. If you don't know, ask whoever you work for: the agent that started you through ask_caller, or else the user."

export const createAsk =
  (ctx: OrchestratorContext, { starters, owners, outbox }: Asking) =>
  async (thread: string, question: string, id: string) => {
    const session = findThread(ctx, thread)
    const starter = starters.of(session)
    if (!starter) throw failure('invalid_request', 'Only a subagent asks the agent that started it')
    const label = session.title || 'Untitled thread'
    const notice = notificationText({ from: 'thread', id: session.id, kind: 'thread', label, status: 'asks', at: Date.now(), result: question, link: threadLinkNote(session.id, label) })
    const finish = { to: { owner: starter.owner, id: starter.id }, thread: session.id, text: `${notice}\n${howToAnswer}`, clientRequestId: `${session.id}?${id}` }
    if (starter.pc) {
      outbox.put(starter.pc, { ...finish, asks: true })
      return void ctx.get(server)?.broadcast(threadReported, session.id)
    }
    if (!(await owners.deliver(finish.to, finish))) throw failure('not_found', 'The agent that started you is gone')
  }
