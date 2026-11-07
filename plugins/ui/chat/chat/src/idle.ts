import { palette as paletteService } from '@sand/palette/contract'
import { span } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'

export const searchHint = (ctx: ChatContext) => {
  const found = ctx.get(paletteService)
  if (!found) return null
  const { isMac, keycap, quietButton } = ctx.kit
  return quietButton(
    { class: 'pointer-events-auto', onClick: () => found.open() },
    span({ class: 'flex gap-1' }, keycap(isMac() ? '⌘' : 'Ctrl'), keycap('K')),
    'Search threads, projects and actions',
  )
}
