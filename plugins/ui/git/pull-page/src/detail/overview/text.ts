import { markdown } from '@sand/markdown/contract'
import { div } from '@vaakx-dev/vrui'
import type { PageParts } from '../../parts'

export const richText = (parts: PageParts, source: string) => {
  const found = parts.ctx.get(markdown)
  return div({ class: 'min-w-0 text-sm text-neutral-100 wrap-anywhere' }, ...(found ? found.nodes(source) : [div({ class: 'whitespace-pre-wrap' }, source)]))
}
