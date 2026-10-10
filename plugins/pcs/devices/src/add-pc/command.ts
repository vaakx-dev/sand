import { installLink } from '@sand/kit'
import type { HostRoute } from '@sand/host-gateway/contract'
import type { UpdateChannel } from '@sand/host-updates/contract'

export type InstallSystem = 'win' | 'linux' | 'mac'
export type InstallVia = 'lan' | 'tailscale'

const installer = 'https://vaakx-dev.github.io/sand/install'

export const installCommand = (os: InstallSystem, url: string, secret: string, channel: UpdateChannel) => {
  const link = installLink(url, secret)
  const release = channel === 'release'
  if (os === 'win') return `${release ? '' : `$env:SAND_CHANNEL='${channel}'; `}$env:SAND_PAIR='${link}'; irm ${installer}.ps1 | iex`
  return `curl -fsSL ${installer}.sh | sh -s -- ${release ? '' : `--channel ${channel} `}--pair '${link}'`
}

export const routeFor = (routes: HostRoute[], via: InstallVia) => {
  if (via === 'lan') return routes.find(route => route.kind === 'lan')
  const tailnet = routes.filter(route => route.kind === 'tailscale')
  return tailnet.find(route => route.url.startsWith('https:')) ?? tailnet[0]
}
