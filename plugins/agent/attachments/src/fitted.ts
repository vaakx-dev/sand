import type { DocumentBlock, ImageBlock, MediaRef } from '@sand/chats/contract'

type Unstored<Block> = Omit<Block, keyof MediaRef>

export interface Fitted {
  bytes: Uint8Array
  block: Unstored<ImageBlock> | Unstored<DocumentBlock>
}

export class TooLarge extends Error {}
