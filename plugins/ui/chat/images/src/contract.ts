import type { ImageBlock } from '@sand/chats/contract'
import { service } from 'drydock'

export interface ImageViewer {
  open(thread: string, block: ImageBlock): void
}

export type ReplyImage = (src: string, alt: string) => HTMLElement | undefined

export interface ReplyImages {
  forReply(thread: string, at: number): ReplyImage
}

export const imageViewer = service<ImageViewer>('imageViewer')
export const replyImages = service<ReplyImages>('replyImages')
