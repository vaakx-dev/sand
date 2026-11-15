import type { Session, Sessions } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import type { Orchestrator } from '@sand/orchestrator/contract'

export interface Responsible {
  bot?: string
  threads: string[]
}

export const responsibleFor =
  (sessions: () => Sessions | undefined, orchestrator: () => Orchestrator | undefined) =>
  (conversation: ConversationRef): Responsible => {
    const parentOf = (session: Session | undefined): ConversationRef | undefined => {
      const parent = session?.kind === 'agent' && session.parent ? sessions()?.open(session.parent) : undefined
      return parent && { owner: parent.owner, id: parent.id }
    }

    const threads: string[] = []
    let at: ConversationRef | undefined = conversation
    while (at?.owner === 'thread' && !threads.includes(at.id)) {
      threads.push(at.id)
      at = parentOf(sessions()?.open(at.id)) ?? orchestrator()?.starterOf(at.id)
    }
    return { ...(at?.owner === 'bot' && { bot: at.id }), threads }
  }
