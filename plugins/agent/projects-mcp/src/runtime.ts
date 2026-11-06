import { peers } from '@sand/devices-contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { serveProjects } from './serve'
import { offerProjectTools } from './tools'

export default definePlugin({
  name: 'projects-mcp',
  description:
    "Serves sand's project tools to its own threads and bots and to outside agents: list, add, create, rename, hide and remove projects, and set where new ones go, on this PC or another",
  inject: { hostChannel },
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerProjectTools(found))
    ctx.watch(server, found => found && serveProjects(found, ctx.hostChannel, () => ctx.get(peers)))
  },
})
