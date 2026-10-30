import type { UserContent } from '@sand/chats/contract'
import { helloField, request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface AttachmentLimits {
  uploadBytes: number
}

export interface Attachments {
  isMedia(path: string): boolean
  fromFile(path: string): Promise<UserContent>
  fromBytes(data: Uint8Array, name: string): Promise<UserContent>
}

export const attachments = service<Attachments>('attachments')

export const helloAttachments = helloField<AttachmentLimits>('attachments')

export const attachmentsFinish = request('attachments.finish', {
  input: z.object({ transfer: z.string(), name: z.string(), chunks: z.number().int(), size: z.number().int() }),
  output: type<UserContent>(),
})
