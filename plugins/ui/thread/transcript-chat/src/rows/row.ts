import type { Markdown } from '@sand/markdown/contract'
import type { Item, OpenStates, RendererRegistry, TranscriptParts } from '@sand/transcript-parts/contract'
import { button, chevron, focusable, type Child, type ContextMenu, type NavAction, type Sig } from '@sand/dom'

export interface Row {
  key: string
  data: unknown
  view(data: Sig<unknown>): HTMLElement
}

export interface RowContext {
  registry: RendererRegistry
  states: OpenStates
  thread: string
  parts: TranscriptParts
  markdown: Markdown
  menu: ContextMenu
  rewrite(entry: string, text: string): NavAction[]
}

export type RowMaker<K extends Item['kind']> = (item: Extract<Item, { kind: K }>, context: RowContext) => Row

export const row = <T>(key: string, data: T, view: (data: Sig<T>) => HTMLElement): Row => ({ key, data, view: view as Row['view'] })

export const worked = (toggle: () => void, open: Sig<boolean>, ...children: Child[]) =>
  button(
    { type: 'button', class: ['inline-flex h-6 items-center gap-2 rounded-md px-1 text-sm text-neutral-400 hover:text-neutral-300', focusable], onClick: toggle },
    ...children,
    chevron(() => open.get()),
  )
