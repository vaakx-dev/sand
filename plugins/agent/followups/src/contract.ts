import type { Prompt } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Pending } from '@sand/steering/contract'

export interface FollowUps {
  list(session: Session): Pending[]
  add(session: Session, prompt: Prompt, label?: string): Pending
  remove(session: Session, id: string): boolean
  edit(session: Session, id: string, prompt: Prompt, label?: string): boolean
  move(session: Session, id: string, index: number): boolean
  send(session: Session, id: string): boolean
}

declare module 'drydock' {
  interface Services {
    followUps: FollowUps
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'queue.add': { session: string; prompt: Prompt; label?: string }
    'queue.remove': { session: string; item: string }
    'queue.edit': { session: string; item: string; prompt: Prompt; label?: string }
    'queue.move': { session: string; item: string; index: number }
    'queue.send': { session: string; item: string }
  }
}
