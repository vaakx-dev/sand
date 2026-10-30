import type { Dispose } from 'drydock'
import type { PublishedRoute } from '../connection/routes'

export type NetworkScope = 'local' | 'network'

export interface NetworkState {
  scope: NetworkScope
  routes: PublishedRoute[]
}

export type DiscoverySource = 'lan' | 'tailscale'

export interface DiscoveredPc {
  id: string
  name: string
  platform: string
  url: string
  via: DiscoverySource
  paired: boolean
  joining?: string
}

export interface Network {
  state(): NetworkState
  setScope(scope: NetworkScope): Promise<NetworkState>
  discovered(): DiscoveredPc[]
  onChange(listener: (state: NetworkState) => void): Dispose
  onDiscover(listener: (found: DiscoveredPc[]) => void): Dispose
}
