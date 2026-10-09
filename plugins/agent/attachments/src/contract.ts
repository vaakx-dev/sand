import type { UserContent } from '@sand/messages'

export interface AttachmentLimits {
  imageEdge: number
  imageBytes: number
  pdfBytes: number
  textLength: number
}

export interface Attachments {
  limits: AttachmentLimits
  fromFile(path: string, name?: string): Promise<UserContent>
  fromBytes(name: string, data: Uint8Array, mediaType?: string): Promise<UserContent>
  fromClipboard(): Promise<UserContent | undefined>
  compose(text: string, attachments: UserContent[]): UserContent[]
}

declare module 'drydock' {
  interface Services {
    attachments: Attachments
  }
}

declare module '@sand/protocol/wire' {
  interface HelloFields {
    attachments?: AttachmentLimits
  }
}
