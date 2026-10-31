import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'
import { richText } from './text'

export const descriptionBlock = (shown: Shown) =>
  div(
    { class: 'border-t border-neutral-800 pt-3' },
    dynamicChild(
      () => shown.pull().body.trim(),
      body => (body ? richText(shown.parts, body) : shown.parts.kit.emptyState({ text: 'No description.', flush: true })),
    ),
  )
