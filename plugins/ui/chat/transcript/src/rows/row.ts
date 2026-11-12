import type { ContextLink, ContextRecord } from '@sand/chats/contract'
import type { Markdown, MarkdownImage } from '@sand/markdown/contract'
import type { Item, MediaImage, RendererRegistry, Row, Surface } from '../contract'
import { selectingIn, type Kit } from '@sand/ui-kit/contract'
import { div, media, sig, type Child } from '@vaakx-dev/vrui'

export interface RowContext extends Surface {
  kit: Kit
  registry: RendererRegistry
  markdown: Markdown
  media: MediaImage
  image: MarkdownImage
  chip(link: ContextLink, record?: ContextRecord): Child
  open(record: ContextRecord): void
}

export type RowMaker<K extends Item['kind']> = (item: Extract<Item, { kind: K }>, context: RowContext) => Row

export const row = <T>(key: string, data: T, view: Row<T>['view']): Row<T> => ({ key, data, view })

export const pressable = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('a, button, input, textarea'))

export const tapReveal = () => {
  const tapped = sig(false)
  const touch = media('(hover: none)')
  const onClick = (event: MouseEvent) => {
    if (!touch.get() || selectingIn(event.currentTarget) || pressable(event.target)) return
    tapped.update(value => !value)
  }
  return { tapped, onClick }
}

export const actionRow = (onTouch: () => boolean, extra: string, ...children: Child[]) =>
  div(
    {
      class: [
        'flex h-6 shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible-within:opacity-100',
        () => (onTouch() ? 'touch:opacity-100' : 'touch:pointer-events-none'),
        extra,
      ],
    },
    ...children,
  )

export const workFrame = (...children: Child[]) => div({ class: 'chat-row flex flex-col' }, ...children)
