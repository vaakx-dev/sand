import { createMcpHandler } from '@modelcontextprotocol/server'
import type { Auth } from '@sand/devices-contract'
import type { Caller } from '@sand/host-hub/contract'
import { bearerToken, textReply } from '@sand/util/host'
import type { McpTool } from '@sand/mcp-server/contract'
import { mcpServer, type Use } from '../server'

const unpaired = () => textReply('this agent is not paired with sand; add it in Settings → Devices', 401, { 'www-authenticate': 'Bearer' })

export const agentEndpoint = (agentOf: Auth['agent'], useAs: (caller: Caller) => Use, tools: () => McpTool[]) => (request: Request) => {
  const token = bearerToken(request)
  const agent = token ? agentOf(token) : undefined
  if (!agent) return unpaired()
  return createMcpHandler(() => mcpServer(useAs(agent.caller), tools(), { access: agent.access })).fetch(request)
}
