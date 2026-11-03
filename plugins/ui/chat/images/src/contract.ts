import type { ImageBlock } from '@sand/chats/contract'
import { service } from 'drydock'

export interface ImageViewer {
  open(thread: string, block: ImageBlock): void
  show(src: string, name?: string): void
}

export const imageViewer = service<ImageViewer>('imageViewer')
