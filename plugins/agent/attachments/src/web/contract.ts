import type { Prompt, UserContent } from '@sand/chats/contract'
import type { Sig } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export type Held = UserContent | File

export interface ShelfPlace {
  device(): string | undefined
  thread(): string | undefined
}

export interface Shelf {
  attachable(): boolean
  rejected(): boolean
  upload(): Promise<UserContent[]>
  pick(): void
  paste(text: string): boolean
  view(): HTMLElement
  drops(area: () => Element | null | undefined): HTMLElement
}

export interface Shelves {
  create(items: Sig<Held[]>, place: ShelfPlace): Shelf
}

export const shelves = service<Shelves>('attachments.shelves')

export const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes('Files')

export const contentName = (item: UserContent) => ('name' in item && item.name) || item.type

export const promptOf = (text: string, content: UserContent[]): Prompt => {
  if (!content.length) return text
  return text.trim() ? [...content, { type: 'text', text }] : content
}

export const labelOf = (text: string, content: UserContent[]) => text || content.map(contentName).join(', ')
