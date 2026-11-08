import type { Sessions } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import type { Orchestrator } from '@sand/orchestrator/contract'

export interface Responsible {
  bot?: string
  threads: string[]
}

export const responsibleFor =
  (sessions: () => Sessions | undefined, orchestrator: () => Orchestrator | undefined) =>
  (conversation: ConversationRef): Responsible => {
    const threads: string[] = []
    let at: ConversationRef | undefined = conversation
    while (at?.owner === 'thread' && !threads.includes(at.id)) {
      threads.push(at.id)
      const session = sessions()?.open(at.id)
      at = session?.kind === 'agent' && session.parent ? { owner: 'thread', id: session.parent } : orchestrator()?.starterOf(at.id)
    }
    return { ...(at?.owner === 'bot' && { bot: at.id }), threads }
  }
