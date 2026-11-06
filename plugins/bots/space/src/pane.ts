import type { Kit } from '@sand/ui-kit/contract'
import { div, show, type Child, type Props, type Sig } from '@vaakx-dev/vrui'

export const column = 'mx-auto w-full max-w-3xl'

export interface HeadParts {
  narrow: Sig<boolean>
  showSide(): void
  close?: () => void
}

export const paneHead = (kit: Kit, { narrow, showSide, close }: HeadParts, ...children: Child[]) =>
  kit.paneHead(
    { led: narrow, class: column },
    show(narrow, () => kit.showSideButton(narrow, 'Show bots', showSide)),
    ...children,
    close ? show(narrow, () => kit.closeButton({ title: 'Close bots', onClick: close })) : null,
  )

export const pane = (props: Props<HTMLDivElement>, head: HTMLElement, ...body: Child[]) =>
  div({ ...props, class: 'flex h-full min-h-0 flex-1 flex-col' }, head, ...body)

export const scrollArea = (kit: Kit, props: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ ...props, class: 'flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain', style: kit.stableGutter }, ...children)

export const scrollBody = (kit: Kit, ...children: Child[]) => scrollArea(kit, {}, div({ class: [column, 'flex flex-col gap-6 px-4 pt-4 pb-16'] }, ...children))
