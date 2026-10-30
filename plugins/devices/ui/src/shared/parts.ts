import type { Kit } from '@sand/ui-kit/contract'
import { div, p, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'

export const copyBox = (kit: Kit, text: MaybeReactive<string>) =>
  div(
    { class: 'flex min-w-0 items-center gap-2 rounded-lg bg-neutral-900 py-1 pr-1 pl-3 font-mono text-xs text-neutral-100' },
    span({ class: 'min-w-0 flex-1 wrap-anywhere' }, text),
    kit.copyButton({ text: () => read(text), surface: 'page' }),
  )

export const centered = (...children: Child[]) => div({ class: 'flex flex-col items-center gap-2 py-2 text-center' }, ...children)

export const heading = (text: MaybeReactive<string>) => p({ class: 'text-base font-medium text-neutral-100 wrap-anywhere' }, text)

export const note = (...children: Child[]) => p({ class: 'text-xs text-neutral-400' }, ...children)

export const field = (label: Child, ...children: Child[]) =>
  div({ class: 'flex flex-col gap-1.5' }, span({ class: 'text-xs text-neutral-400' }, label), ...children)

export const command = (text: string) => span({ class: 'rounded-sm bg-neutral-700 px-1 font-mono text-xs whitespace-nowrap' }, text)

export const doneBlock = (kit: Kit, title: MaybeReactive<string>, text: MaybeReactive<string>) =>
  centered(kit.doneMark(), heading(title), kit.sheetText(text))
