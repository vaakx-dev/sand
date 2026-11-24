import type { SourceInfo } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'

export const logo = ({ modelLogo }: Kit, provider?: string) => modelLogo(provider, 16)

const offlineText = (source: SourceInfo) => (source.online === false ? ' · offline' : '')

export const whereText = (source: SourceInfo) => (source.via ? `On ${source.via}${offlineText(source)}` : '')
