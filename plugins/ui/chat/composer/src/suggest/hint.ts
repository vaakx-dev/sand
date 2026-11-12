import type { Kit } from '@sand/ui-kit/contract'
import { button, dynamicChild, span } from '@vaakx-dev/vrui'
import type { Suggestion } from '../contract'

export interface HintParts {
  kit: Kit
  placeholder: () => string
  suggestion: () => Suggestion | undefined
  coarse: () => boolean
  accept(): void
}

const keepFocus = (event: MouseEvent) => event.preventDefault()

const pill = ({ kit, coarse, accept }: HintParts) =>
  button(
    {
      type: 'button',
      class:
        'ml-1.5 inline-flex h-5 cursor-pointer items-center gap-1 rounded-md bg-neutral-900 px-2 text-xs font-medium text-neutral-400 ring-1 ring-neutral-700 hover:text-neutral-200',
      'aria-label': 'Use this message',
      onMouseDown: keepFocus,
      onClick: accept,
    },
    dynamicChild(coarse, touch => kit.icon(touch ? 'return' : 'tab-key', 12), span({ class: 'contents' })),
    span(() => (coarse() ? 'Use' : 'Tab')),
  )

export const hint = (parts: HintParts) => () =>
  span(
    () => parts.suggestion()?.text ?? parts.placeholder(),
    dynamicChild(() => Boolean(parts.suggestion()), shown => (shown ? pill(parts) : null), span({ class: 'contents' })),
  )
