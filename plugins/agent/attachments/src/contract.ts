import type { UserContent } from '@sand/messages'

export interface AttachmentLimits {
  imageEdge: number
  imageBytes: number
  pdfBytes: number
  textLength: number
  uploadBytes: number
}

export interface Attachments {
  limits: AttachmentLimits
  fromFile(path: string): Promise<UserContent>
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

  interface WireRequests {
    'attachments.finish': { transfer: string; name: string; chunks: number; size: number }
  }
}
