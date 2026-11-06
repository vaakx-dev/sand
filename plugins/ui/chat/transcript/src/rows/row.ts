import type { ContextLink, ContextRecord } from '@sand/chats/contract'
import type { Markdown, MarkdownImage } from '@sand/markdown/contract'
import type { Item, MediaImage, MenuKit, RendererRegistry, Row, Surface } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, type Child } from '@vaakx-dev/vrui'

export interface RowContext extends Surface {
  kit: Kit
  registry: RendererRegistry
  markdown: Markdown
  menus: MenuKit
  media: MediaImage
  image: MarkdownImage
  chip(link: ContextLink, record?: ContextRecord): Child
}

export type RowMaker<K extends Item['kind']> = (item: Extract<Item, { kind: K }>, context: RowContext) => Row

export const row = <T>(key: string, data: T, view: Row<T>['view']): Row<T> => ({ key, data, view })

export const actionRow = (children: Child[], extra?: string) =>
  div({ class: ['flex h-6 items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-visible-within:opacity-100 touch:opacity-100', extra] }, ...children)

export const workFrame = (...children: Child[]) => div({ class: 'chat-row -mx-2 mb-2 flex flex-col' }, ...children)
