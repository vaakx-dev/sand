import { type NetworkScope, networkGet, networkSet, type NetworkState } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { routeName } from './describe'

const scopes: Record<string, NetworkScope> = { on: 'network', off: 'local' }

const readScope = (value?: string) => {
  if (value === undefined) return
  const scope = scopes[value]
  if (!scope) throw new Error('usage: sand devices network [on | off]')
  return scope
}

const print = ({ scope, routes }: NetworkState) =>
  console.log(
    [
      scope === 'network' ? 'sand listens on your home network and Tailscale:' : 'sand only listens on this computer:',
      ...routes.map(route => `  ${route.url}  (${routeName(route.kind)})`),
      ...(scope === 'network' ? ['run `sand devices add` to pair a phone'] : []),
    ].join('\n'),
  )

export const network = async (daemon: Daemon, value?: string) => {
  const scope = readScope(value)
  print(await (scope ? daemon.request(networkSet, { scope }) : daemon.request(networkGet, {})))
}
