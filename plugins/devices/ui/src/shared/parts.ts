import type { Kit } from '@sand/ui-kit/contract'
import { div, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'

export const copyBox = (kit: Kit, text: MaybeReactive<string>) => kit.codeBlock({ copy: () => read(text) }, text)

export const centered = (...children: Child[]) => div({ class: 'flex flex-col items-center gap-2 py-2 text-center wrap-anywhere' }, ...children)

export const command = (text: string) => span({ class: 'font-mono text-neutral-100 wrap-anywhere' }, text)

export const doneBlock = (kit: Kit, title: MaybeReactive<string>, text: MaybeReactive<string>) =>
  centered(kit.doneMark(), kit.sectionTitle(title), kit.sheetText(text))
