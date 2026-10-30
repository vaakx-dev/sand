import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'
import type { PublishedRoute } from '../connection/routes'
import type { DiscoveredPc, Network, NetworkState } from './types'

export const network = service<Network>('network')

export const networkGet = request('network.get', { input: z.object({}), output: type<NetworkState>() })
export const networkSet = request('network.set', { input: z.object({ scope: z.enum(['local', 'network']) }), output: type<NetworkState>() })
export const networkChange = wireEvent<NetworkState>('network.change')

export const pcRoutes = request('pc.routes', { input: z.object({}), output: type<PublishedRoute[]>(), callers: 'any' })
export const helloRoutes = helloField<PublishedRoute[]>('routes')
export const routesChange = wireEvent<PublishedRoute[]>('routes')

export const pcsDiscover = request('pcs.discover', { input: z.object({}), output: type<DiscoveredPc[]>() })
export const discoverChange = wireEvent<DiscoveredPc[]>('discover.change')
