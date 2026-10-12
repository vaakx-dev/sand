import { div, h2, p, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { layer } from '../layer'

export const setupFrame = (...children: Child[]) =>
  div(
    { class: [layer.drawer, 'absolute inset-0 flex flex-col items-center overflow-auto bg-neutral-900 px-5 py-10 text-center'] },
    span({ class: 'flex-1' }),
    ...children,
    span({ class: 'flex-1' }),
  )

export const setupScreen = (...children: Child[]) => div({ class: 'flex w-full flex-col items-center gap-6' }, ...children)

export const setupHeading = (text: MaybeReactive<string>) => h2({ class: 'text-xl font-semibold text-neutral-100' }, text)

export const setupNote = (text: MaybeReactive<string>) => p({ class: '-mt-4 text-sm text-neutral-400' }, text)

export const setupColumn = (...children: Child[]) => div({ class: 'flex w-full max-w-sm flex-col gap-3 text-left' }, ...children)

export const setupFooter = (...children: Child[]) => div({ class: 'flex w-full max-w-sm items-center justify-between gap-2' }, ...children)
