import type { Kit } from '@sand/ui-kit/contract'
import type { ChipScope, Screen } from '@sand/ui-shell/contract'
import { derive, div, h1, list, type Sig } from '@vaakx-dev/vrui'
import { byOrder } from '@sand/util'
import type { HomeHeadPart } from '../contract'

export interface ScreenParts {
  kit: Kit
  head: Sig<HomeHeadPart[]>
  composer: () => HTMLElement
  counts: (scope: ChipScope) => HTMLElement
}

export const newThreadScreen = (parts: ScreenParts): Screen => ({
  head: () => [
    h1({ class: 'sr-only' }, 'New thread'),
    list(
      derive(() => parts.head.get().toSorted(byOrder)),
      part => part.id,
      part => part.get().render(),
      div({ class: 'flex min-w-0 items-center gap-1' }),
    ),
  ],
  main: () =>
    div(
      { class: 'flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pt-24 pb-24' },
      div(
        { class: [parts.kit.pageColumn, 'flex flex-col gap-4'] },
        div({ class: 'px-3 text-xl font-semibold tracking-tight text-neutral-100' }, 'What should change?'),
        parts.composer(),
        div({ class: 'px-2' }, parts.counts({ kind: 'general' })),
      ),
    ),
})
