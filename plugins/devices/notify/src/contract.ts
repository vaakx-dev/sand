import { pushTargetSchema } from '@sand/devices-contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export const momentLabels = {
  finished: 'Finished',
  failed: 'Failed',
}

export type MomentKind = keyof typeof momentLabels

export interface Moment {
  kind: MomentKind
  thread: string
  title: string
  text: string
}

export interface Notice {
  title: string
  body: string
  tag: string
  pc: string
  thread: string
}

export interface Notify {
  send(moment: Moment): Promise<void>
}

export const notify = service<Notify>('notify')

const momentSchema = z.object({
  kind: z.custom<MomentKind>(kind => typeof kind === 'string' && Object.hasOwn(momentLabels, kind)),
  thread: z.string().min(1),
  title: z.string(),
  text: z.string(),
})

const noticeSchema = z.object({ title: z.string(), body: z.string(), tag: z.string().min(1), pc: z.string().min(1), thread: z.string().min(1) })

export const notifySend = request('notify.send', { input: momentSchema, output: type<void>(), callers: 'runtime' })
export const notifyDeliver = request('notify.deliver', { input: noticeSchema, output: type<void>(), callers: 'pc' })
export const notifySubscribe = request('notify.subscribe', { input: pushTargetSchema, output: type<void>() })
export const notifyUnsubscribe = request('notify.unsubscribe', { input: z.object({}), output: type<void>() })

export const notifyNotice = wireEvent<Notice>('notify.notice')

export const helloPushKey = helloField<string>('pushKey')
