import type { RemoteRecord } from '@sand/host-remotes/contract'

export const remoteUrls = ({ url, urls }: Pick<RemoteRecord, 'url' | 'urls'>) => [...new Set([url, ...urls])]
