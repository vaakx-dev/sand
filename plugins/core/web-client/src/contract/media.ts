import type { ImageBlock, UserContent } from '@sand/chats/contract'

export interface Media {
  show(image: HTMLImageElement, block: ImageBlock, thread?: string): HTMLImageElement
  inline(content: UserContent[], thread?: string): Promise<UserContent[]>
}
