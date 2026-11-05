import { auth, devicePaths } from '@sand/devices-contract'
import { hostHttp } from '@sand/host-gateway/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { agentEndpoint } from './endpoint'
import { hubUse } from './link'

export default definePlugin({
  name: 'mcp',
  description: "Serves sand's threads over MCP at /mcp to agents paired in Settings → Devices, read-only or able to start and message threads",
  inject: { auth, hostHttp, hub },
  apply(ctx) {
    const endpoint = agentEndpoint(
      token => ctx.auth.agent(token),
      caller => hubUse(ctx.hub, caller),
    )
    ctx.effect(() => ctx.hostHttp.route(devicePaths.mcp, { method: 'POST', handle: ({ request }) => endpoint(request) }))
  },
})
