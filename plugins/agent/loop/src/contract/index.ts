import { type Prompt, promptInput } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { sessionSettings } from '@sand/model/contract'
import type { TurnResult } from '@sand/turns-contract/contract'
import { service } from 'drydock'
import { z } from 'zod'
import type { Loop } from './turn'

export type * from './turn'

export interface Pending {
  id: string
  label: string
  prompt: Prompt
  at: number
}

export interface QueueState {
  steers: Pending[]
}

export const loop = service<Loop>('loop')

export const queueChange = wireEvent<[session: string, state: QueueState]>('queue.change')

const session = z.object({ session: z.string() })
const place = 'thread'

export const loopRun = request('loop.run', {
  input: session.extend({ prompt: promptInput, settings: sessionSettings.optional() }),
  output: type<TurnResult>(),
  place,
})
export const loopSteer = request('loop.steer', {
  input: session.extend({ prompt: promptInput, label: z.string().optional() }),
  output: type<string | null>(),
  place,
})
export const loopUnsteer = request('loop.unsteer', { input: session.extend({ item: z.string() }), output: type<boolean>(), place })
export const loopInterrupt = request('loop.interrupt', { input: session, output: type<boolean>(), place })
