import type { Prompt, UserContent } from '@sand/messages'
import type { Session, WireSession } from '@sand/sessions-sqlite/contract'

export interface Pending {
  id: string
  label: string
  prompt: Prompt
  at: number
}

export interface QueueState {
  steers: Pending[]
  followUps: Pending[]
}

export interface Steering {
  steer(session: Session, prompt: Prompt, label?: string): string | undefined
  unsteer(session: Session, id: string): boolean
  list(session: Session): Pending[]
}

declare module 'drydock' {
  interface Services {
    steering: Steering
  }

  interface Events {
    'turn.steer': (session: Session, content: UserContent[], id: string) => void
    'turn.queue': (session: Session) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'loop.steer': { session: string; prompt: Prompt; label?: string }
    'loop.unsteer': { session: string; item: string }
    'queue.get': { session: string }
  }

  interface WireEvents {
    'turn.steer': [session: WireSession, content: UserContent[], id: string]
    'queue.change': [session: string, state: QueueState]
  }
}
