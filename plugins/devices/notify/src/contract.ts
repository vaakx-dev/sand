import { pushTargetSchema } from '@sand/devices-contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export const momentKinds = ['needs', 'finished', 'failed', 'routine', 'paused'] as const

export type MomentKind = (typeof momentKinds)[number]

export const moments: Record<MomentKind, { label: string; detail: string }> = {
  needs: { label: 'Needs you', detail: 'A call waits for your approval' },
  finished: { label: 'Finished', detail: 'A turn in a thread finished' },
  failed: { label: 'Failed', detail: 'A turn or a routine failed' },
  routine: { label: 'Routine', detail: 'A bot ran one of its reminders or routines' },
  paused: { label: 'Paused', detail: 'A bot reached its monthly spend limit and paused' },
}

export interface Moment {
  kind: MomentKind
  thread?: string
  title: string
  text: string
}

export interface Notice {
  title: string
  body: string
  tag: string
  pc: string
  thread?: string
}

export interface Notify {
  send(moment: Moment): Promise<void>
}

export const notify = service<Notify>('notify')

export const momentKindSchema = z.enum(momentKinds)

const momentSchema = z.object({
  kind: momentKindSchema,
  thread: z.string().min(1).optional(),
  title: z.string(),
  text: z.string(),
})

const noticeSchema = z.object({ title: z.string(), body: z.string(), tag: z.string().min(1), pc: z.string().min(1), thread: z.string().min(1).optional() })

export const notifySend = request('notify.send', { input: momentSchema, output: type<void>(), callers: 'runtime' })
export const notifyDeliver = request('notify.deliver', { input: noticeSchema, output: type<void>(), callers: 'pc' })
export const notifySubscribe = request('notify.subscribe', { input: pushTargetSchema, output: type<void>() })
export const notifyUnsubscribe = request('notify.unsubscribe', { input: z.object({}), output: type<void>() })
export const notifyMoment = request('notify.moment', { input: z.object({ kind: momentKindSchema, on: z.boolean() }), output: type<void>() })

export const notifyNotice = wireEvent<Notice>('notify.notice')
export const notifyMomentsOff = wireEvent<MomentKind[]>('notify.moments')

export const helloPushKey = helloField<string>('pushKey')
export const helloMomentsOff = helloField<MomentKind[]>('momentsOff')
