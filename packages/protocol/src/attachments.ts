import type { UserContent } from './message'

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
