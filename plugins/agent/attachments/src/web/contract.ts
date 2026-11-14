import type { UserContent } from '@sand/chats/contract'
import type { Sig } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export type Held = UserContent | File

export type Upload =
  | { phase: 'queued' | 'uploading' | 'offline' | 'retrying'; sent: number }
  | { phase: 'done'; sent: number; content: UserContent }
  | { phase: 'failed'; sent: number; error: string }

export interface ShelfPlace {
  device(): string | undefined
  thread(): string | undefined
}

export interface Shelf {
  attachable(): boolean
  rejected(): boolean
  pick(): void
  paste(text: string): boolean
  view(): HTMLElement
  drops(area: () => Element | null | undefined): HTMLElement
}

export interface Progress {
  files: number
  sent: number
  size: number
  stalled?: 'offline' | 'retrying'
}

export interface Shelves {
  create(items: Sig<Held[]>, place: ShelfPlace): Shelf
  content(items: Held[], device: string | undefined): Promise<UserContent[]>
  uploaded(items: Held[], device: string | undefined): UserContent[]
  progress(items: Held[], device: string | undefined): Progress | undefined
  shown(items: Held[], device: string | undefined): UserContent[]
}

export const shelves = service<Shelves>('attachments.shelves')

export const stored = (item: Held): item is UserContent => !(item instanceof File)

export const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes('Files')

export const contentName = (item: UserContent) => ('name' in item && item.name) || item.type

export const labelOf = (text: string, content: UserContent[]) => text || content.map(contentName).join(', ')
