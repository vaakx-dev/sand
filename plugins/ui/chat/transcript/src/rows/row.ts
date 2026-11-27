import type { ContextLink, ContextRecord } from '@sand/chats/contract'
import type { Markdown, NodeOptions } from '@sand/markdown/contract'
import type { FileOpener, Item, MediaImage, RendererRegistry, Row, Surface } from '../contract'
import { selectingIn, type Kit } from '@sand/ui-kit/contract'
import { div, media, sig, type Child } from '@vaakx-dev/vrui'

export interface RowContext extends Surface {
  kit: Kit
  registry: RendererRegistry
  markdown: Markdown
  media: MediaImage
  prose: NodeOptions
  fileOpener: FileOpener
  chip(link: ContextLink, record?: ContextRecord): Child
  open(record: ContextRecord): void
}

export type RowMaker<K extends Item['kind']> = (item: Extract<Item, { kind: K }>, context: RowContext) => Row

type Space = 'kept' | 'freed'

interface ActionRowProps {
  shownOnTouch(): boolean
  space: Space
  class?: string
}

const HIDDEN_ON_TOUCH: Record<Space, string> = { kept: 'touch:pointer-events-none', freed: 'touch:hidden' }

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

export const actionRow = ({ shownOnTouch, space, class: extra }: ActionRowProps, ...children: Child[]) =>
  div(
    {
      class: [
        'flex h-6 shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible-within:opacity-100',
        () => (shownOnTouch() ? 'touch:opacity-100' : HIDDEN_ON_TOUCH[space]),
        extra,
      ],
    },
    ...children,
  )

export const workFrame = (...children: Child[]) => div({ class: 'chat-row flex flex-col' }, ...children)
