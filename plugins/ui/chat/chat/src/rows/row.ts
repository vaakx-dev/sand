import type { Markdown, MarkdownImage } from '@sand/markdown/contract'
import type { Item, OpenStates, RendererRegistry, TranscriptParts } from '../parts/contract'
import type { NavAction } from '@sand/nav/contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, type Child, type Sig } from '@vaakx-dev/vrui'

export interface Row<T = unknown> {
  key: string
  data: T
  view(data: Sig<T>, railed?: Sig<boolean>): HTMLElement
}

export interface RowContext {
  kit: Kit
  registry: RendererRegistry
  states: OpenStates
  thread: string
  parts: TranscriptParts
  markdown: Markdown
  image: MarkdownImage
  menu: ContextMenu
  rewrite(entry: string, text: string): NavAction[]
  reply(text: string): NavAction[]
  jump(from: Element, quote: string): void
  repaint(): void
}

export type RowMaker<K extends Item['kind']> = (item: Extract<Item, { kind: K }>, context: RowContext) => Row

export const row = <T>(key: string, data: T, view: Row<T>['view']): Row<T> => ({ key, data, view })

export const actionRow = (extra: string, ...children: Child[]) => div({ class: ['flex h-6 items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-visible-within:opacity-100 touch:opacity-100', extra] }, ...children)

export const workFrame = (...children: Child[]) => div({ class: 'chat-row -mx-2 mb-2 flex flex-col' }, ...children)
