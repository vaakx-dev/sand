import { promptInput, type Prompt, type Session, type UserContent, type WireSession } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface Pending {
  id: string
  label: string
  prompt: Prompt
  at: number
}

export interface QueueState {
  steers: Pending[]
}

export interface Steering {
  steer(session: Session, prompt: Prompt, label?: string): string | undefined
  unsteer(session: Session, id: string): boolean
  list(session: Session): Pending[]
}

export const steering = service<Steering>('steering')

export const turnSteer = event<(session: Session, content: UserContent[], id: string) => void>('turn.steer')
export const turnQueue = event<(session: Session) => void>('turn.queue')
export const turnUnsteer = event<(session: Session, id: string) => void>('turn.unsteer')

export const turnSteerWire = wireEvent<[session: WireSession, content: UserContent[], id: string]>('turn.steer')
export const queueChange = wireEvent<[session: string, state: QueueState]>('queue.change')

export const loopSteer = request('loop.steer', {
  input: z.object({ session: z.string(), prompt: promptInput, label: z.string().optional() }),
  output: type<string | null>(),
  place: 'thread',
})
export const loopUnsteer = request('loop.unsteer', { input: z.object({ session: z.string(), item: z.string() }), output: type<boolean>(), place: 'thread' })
