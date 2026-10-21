import type { SessionSummary } from '@sand/chats/contract'
import { helloField } from '@sand/host-hub/contract'

export const helloSessions = helloField<SessionSummary[]>('sessions')
export const helloSync = helloField<string>('sync')
export const helloDelta = helloField<boolean>('delta')
export const helloStarted = helloField<Record<string, number>>('started')
export const helloSafe = helloField<boolean>('safe')
