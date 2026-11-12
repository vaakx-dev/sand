import type { SourceInfo } from '@sand/accounts/contract'
import { sourceName } from '@sand/model-picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, type Child } from '@vaakx-dev/vrui'
import type { Page } from './page'

export const logo = ({ modelLogo }: Kit, provider?: string) => modelLogo(provider, 16)

const offlineText = (source: SourceInfo) => (source.online === false ? ' · offline' : '')

export const whereText = (source: SourceInfo) => (source.via ? `On ${source.via}${offlineText(source)}` : '')

export const sourceTitle = (source: SourceInfo) => `${sourceName(source)}${offlineText(source)}`

export const crumb = (page: Page, mark: Child, title: Child) => {
  const { icon, iconButton, rowTitle } = page.ctx.kit
  return div(
    { class: 'flex min-w-0 items-center gap-2' },
    iconButton({ title: 'Back to Models', 'aria-label': 'Back to Models', onClick: () => page.go({ kind: 'top' }) }, icon('back')),
    mark,
    rowTitle(title),
  )
}
