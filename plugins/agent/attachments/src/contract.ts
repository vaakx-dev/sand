import type { DocumentBlock, ImageBlock, Prompt, UserContent } from '@sand/chats/contract'
import { helloField, type InputOf, request, type } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'

export interface AttachmentLimits {
  uploadBytes: number
}

export interface Attachments {
  isMedia(path: string): boolean
  fromFile(path: string): Promise<ImageBlock | DocumentBlock>
  fromBytes(data: Uint8Array, name: string): Promise<ImageBlock | DocumentBlock>
}

export const attachments = service<Attachments>('attachments')

export const helloAttachments = helloField<AttachmentLimits>('attachments')

export const attachmentsAdd = request('attachments.add', {
  input: () => z.union([z.object({ transfer: z.string(), name: z.string(), chunks: z.number().int(), size: z.number().int() }), z.object({ path: z.string().min(1), cwd: z.string().optional() })]),
  output: type<UserContent>(),
  callers: 'any',
})

type Add = (request: typeof attachmentsAdd, input: InputOf<typeof attachmentsAdd>) => Promise<UserContent>

export const promptOf = (text: string, content: UserContent[]): Prompt => {
  if (!content.length) return text
  return text.trim() ? [...content, { type: 'text', text }] : content
}

export const filesInput = lazy(() =>
  z
    .array(z.string().min(1))
    .optional()
    .describe('Files on this PC to attach, by full path or relative to your folder, like the paperclip in sand: images and documents the model reads, other files saved for it to open'),
)

export const promptWithFiles = async (add: Add, text: string, files: string[] = [], cwd?: string) =>
  promptOf(text, await Promise.all(files.map(path => add(attachmentsAdd, { path, ...(cwd && { cwd }) }))))
