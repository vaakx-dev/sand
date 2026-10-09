import type { RemoteRecord } from '@sand/protocol'

export const remoteUrls = ({ url, urls }: Pick<RemoteRecord, 'url' | 'urls'>) => [...new Set([url, ...urls])]
