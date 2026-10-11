import type { ImageBlock } from '@sand/messages'

export interface ImageViewer {
  open(thread: string, block: ImageBlock): void
}

declare module 'drydock' {
  interface Services {
    imageViewer: ImageViewer
  }
}
