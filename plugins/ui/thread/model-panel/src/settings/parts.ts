import type { SourceInfo } from '@sand/llm-accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span, type Child } from '@vaakx-dev/vrui'
import type { Page } from './page'

export const logo = ({ modelLogo, tile }: Kit, provider?: string) => tile(modelLogo(provider, 18))

export const whereText = (source: SourceInfo) => (source.via ? `on ${source.via}${source.online === false ? ' · offline' : ''}` : '')

export interface LinkRow {
  mark: Child
  title: Child
  detail?: Child
  end?: Child[]
  onClick(): void
}

export const linkRow = ({ icon, rowButton }: Kit, { mark, title, detail, end = [], onClick }: LinkRow) =>
  rowButton(
    { class: 'min-h-12 gap-3 bg-neutral-900 px-4 py-2 hover:bg-neutral-800', onClick },
    mark,
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
      detail ? span({ class: 'truncate text-xs text-neutral-500' }, detail) : null,
    ),
    ...end,
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('right', 14)),
  )

export const crumb = (page: Page, mark: Child, title: Child) => {
  const { icon, plainButton } = page.ctx.kit
  return div(
    { class: 'flex min-w-0 items-center gap-2 px-1' },
    plainButton(
      { class: 'shrink-0 rounded-md text-sm text-neutral-400 hover:text-neutral-100', onClick: () => page.go({ kind: 'top' }) },
      'Models',
    ),
    span({ class: 'inline-flex shrink-0 text-neutral-600' }, icon('right', 14)),
    mark,
    span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
  )
}
