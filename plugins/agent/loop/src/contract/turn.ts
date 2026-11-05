import type { Prompt, Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/turns-contract/contract'

export interface Loop {
  run(session: Session, prompt: Prompt, signal?: AbortSignal): Promise<TurnResult>
  interrupt(session: Session): boolean
  active(session: Session): boolean
}
