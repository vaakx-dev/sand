import { markdown } from '@sand/markdown/contract'
import { div } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'
import { pictureOf } from './picture'

export const richText = (shown: Shown, source: string) => {
  const found = shown.parts.ctx.get(markdown)
  return div(
    { class: 'min-w-0 text-sm text-neutral-100 wrap-anywhere' },
    ...(found ? found.nodes(source, pictureOf(shown.pull().images)) : [div({ class: 'whitespace-pre-wrap' }, source)]),
  )
}
