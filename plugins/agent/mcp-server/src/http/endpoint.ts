import { createMcpHandler } from '@modelcontextprotocol/server'
import type { Auth } from '@sand/devices-contract'
import type { Caller } from '@sand/host-hub/contract'
import { textReply } from '@sand/util/host'
import type { McpTool } from '../contract'
import { mcpServer, type Use } from '../server'

const bearer = /^Bearer\s+(\S+)\s*$/i

const unpaired = () => textReply('this agent is not paired with sand; add it in Settings → Devices', 401, { 'www-authenticate': 'Bearer' })

export const agentEndpoint = (agentOf: Auth['agent'], useAs: (caller: Caller) => Use, tools: () => McpTool[]) => (request: Request) => {
  const token = bearer.exec(request.headers.get('authorization') ?? '')?.[1]
  const agent = token ? agentOf(token) : undefined
  if (!agent) return unpaired()
  return createMcpHandler(() => mcpServer(useAs(agent.caller), tools(), { access: agent.access })).fetch(request)
}
