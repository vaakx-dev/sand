import { div, h1, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { pageTitleLook, secondaryText } from '../heads/text'
import { layer } from '../layer'

export const setupFrame = (...children: Child[]) =>
  div(
    { class: [layer.drawer, 'absolute inset-0 flex flex-col items-center overflow-auto bg-neutral-900 px-5 py-10 text-center'] },
    span({ class: 'flex-1' }),
    ...children,
    span({ class: 'flex-1' }),
  )

export const setupScreen = (...children: Child[]) => div({ class: 'flex w-full flex-col items-center gap-6' }, ...children)

export const setupHeading = (text: MaybeReactive<string>) => h1({ class: pageTitleLook }, text)

export const setupNote = (text: MaybeReactive<string>) => div({ class: '-mt-4' }, secondaryText(text))

export const setupColumn = (...children: Child[]) => div({ class: 'flex w-full max-w-sm flex-col gap-3 text-left' }, ...children)

export const setupFooter = (...children: Child[]) => div({ class: 'flex w-full max-w-sm items-center justify-between gap-2' }, ...children)
