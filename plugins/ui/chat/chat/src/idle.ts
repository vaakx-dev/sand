import { palette as paletteService } from '@sand/palette/contract'
import { span } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'

const keycap = (label: string) => span({ class: 'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 font-mono text-xs text-neutral-500 ring-1 ring-inset ring-neutral-700' }, label)

export const searchHint = (ctx: ChatContext) => {
  const found = ctx.get(paletteService)
  if (!found) return null
  const { isMac, quietButton } = ctx.kit
  return quietButton(
    { class: 'pointer-events-auto', onClick: () => found.open() },
    span({ class: 'flex gap-1' }, keycap(isMac() ? '⌘' : 'Ctrl'), keycap('K')),
    'Search threads, projects and actions',
  )
}
