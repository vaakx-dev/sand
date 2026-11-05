import { devicePaths, pairAgent, type PublishedRoute, type Registry } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { endpointLinks } from './links'

export const agentRequests = (hub: Hub, registry: Registry, routes: () => PublishedRoute[]): (() => Dispose)[] => [
  () =>
    hub.handle(pairAgent, async (agent, caller) => {
      const { device, token } = await registry.addAgent(agent, caller.device)
      return { device, token, links: endpointLinks(routes(), devicePaths.mcp) }
    }),
]
