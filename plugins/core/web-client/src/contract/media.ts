import type { ImageBlock, UserContent } from '@sand/chats/contract'

export interface ShowOptions {
  maxHeight?: number
}

export interface Media {
  show(image: HTMLImageElement, block: ImageBlock, thread?: string, options?: ShowOptions): HTMLImageElement
  inline(content: UserContent[], thread?: string): Promise<UserContent[]>
}
