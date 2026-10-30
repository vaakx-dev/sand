import type { Network, PublishedRoute } from '@sand/devices-contract'
import type { HostHttp } from '@sand/host-gateway/contract'

const loopback = /^https?:\/\/(127\.|localhost|\[::1\])/i
const tailnet = /^https?:\/\/(100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|\[fd7a:115c:a1e0:)/i

const listeningRoutes = (http: Pick<HostHttp, 'urls'>): PublishedRoute[] =>
  http
    .urls()
    .filter(url => !loopback.test(url))
    .map(url => ({ url, kind: tailnet.test(url) ? 'tailscale' : 'lan' }))

export const ownRoutes = (http: Pick<HostHttp, 'urls'>, network: Network | undefined) => (network ? network.state().routes : listeningRoutes(http))
