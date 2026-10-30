import type { ImageBlock } from '@sand/chats/contract'
import { service } from 'drydock'

export interface ImageViewer {
  open(thread: string, block: ImageBlock): void
}

export const imageViewer = service<ImageViewer>('imageViewer')
