export type ReplyImage = (src: string, alt: string) => HTMLImageElement | undefined

export interface ReplyImages {
  forReply(thread: string): ReplyImage
}

declare module 'drydock' {
  interface Services {
    replyImages: ReplyImages
  }
}
