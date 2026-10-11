import type { Markdown, MarkdownImage } from '@sand/markdown/contract'
import type { Item, OpenStates, RendererRegistry, TranscriptParts } from '@sand/transcript-parts/contract'
import { chevron, div, plainButton, type Child, type ContextMenu, type NavAction, type Sig } from '@sand/dom'

export interface Row<T = unknown> {
  key: string
  data: T
  view(data: Sig<T>): HTMLElement
}

export interface RowContext {
  registry: RendererRegistry
  states: OpenStates
  thread: string
  parts: TranscriptParts
  markdown: Markdown
  images(): MarkdownImage | undefined
  menu: ContextMenu
  rewrite(entry: string, text: string): NavAction[]
  reply(text: string): NavAction[]
  jump(from: Element, quote: string): void
  repaint(): void
}

export type RowMaker<K extends Item['kind']> = (item: Extract<Item, { kind: K }>, context: RowContext) => Row

export const row = <T>(key: string, data: T, view: (data: Sig<T>) => HTMLElement): Row<T> => ({ key, data, view })

export const actionRow = (extra: string, ...children: Child[]) => div({ class: ['flex h-6 items-center gap-1 opacity-0 group-hover:opacity-100', extra] }, ...children)

export const worked = (toggle: () => void, open: Sig<boolean>, ...children: Child[]) =>
  plainButton(
    { class: 'inline-flex h-6 items-center gap-2 rounded-md px-1 text-sm text-neutral-400 hover:text-neutral-300', onClick: toggle },
    ...children,
    chevron(() => open.get()),
  )
