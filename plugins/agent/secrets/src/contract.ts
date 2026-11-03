import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'

export type SecretStatus = 'saved' | 'declined' | 'timed_out' | 'cancelled'

export interface SecretRequest {
  id: string
  title: string
  reason: string
  placeholder?: string
}

export interface SecretAnswer {
  id: string
  status: SecretStatus
}

export const requestEntry = 'secret-request'
export const answerEntry = 'secret-answer'

const target = { session: z.string(), id: z.string() }

export const secretWaiting = request('secret.waiting', { input: z.object(target), output: type<boolean>(), place: 'thread' })
export const secretSave = request('secret.save', { input: z.object({ ...target, value: z.string().min(1) }), output: type<void>(), place: 'thread' })
export const secretDecline = request('secret.decline', { input: z.object(target), output: type<void>(), place: 'thread' })
