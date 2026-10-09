import { hostPaths } from '@sand/kit'
import type { HostRoute } from '@sand/protocol'

export type InstallSystem = 'win' | 'linux' | 'mac'
export type InstallVia = 'lan' | 'tailscale'

const trimmed = (url: string) => url.replace(/\/+$/, '')

export const installCommand = (os: InstallSystem, url: string, secret: string) => {
  const key = encodeURIComponent(secret)
  if (os === 'win') return `irm "${trimmed(url)}${hostPaths.installPs}?k=${key}" | iex`
  return `curl -fsSL "${trimmed(url)}${hostPaths.installSh}?k=${key}" | sh`
}

export const routeFor = (routes: HostRoute[], via: InstallVia) => {
  if (via === 'lan') return routes.find(route => route.kind === 'lan')
  const tailnet = routes.filter(route => route.kind === 'tailscale')
  return tailnet.find(route => route.url.startsWith('https:')) ?? tailnet[0]
}
