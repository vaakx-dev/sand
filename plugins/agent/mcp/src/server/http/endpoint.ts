import { createMcpHandler } from '@modelcontextprotocol/server'
import type { Auth } from '@sand/devices-contract'
import type { Caller } from '@sand/host-hub/contract'
import { textReply } from '@sand/util/host'
import { threadsServer, type Use } from '../threads'

const bearer = /^Bearer\s+(\S+)\s*$/i

const unpaired = () => textReply('this agent is not paired with sand; add it in Settings → Devices', 401, { 'www-authenticate': 'Bearer' })

export const agentEndpoint = (agentOf: Auth['agent'], useAs: (caller: Caller) => Use) => (request: Request) => {
  const token = bearer.exec(request.headers.get('authorization') ?? '')?.[1]
  const agent = token ? agentOf(token) : undefined
  if (!agent) return unpaired()
  return createMcpHandler(() => threadsServer(useAs(agent.caller), { access: agent.access })).fetch(request)
}
