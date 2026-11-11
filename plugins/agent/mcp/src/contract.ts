import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type ServerStatus = { state: 'off' } | { state: 'connecting' } | { state: 'ready' } | { state: 'failed'; error: string }

export interface ServerState {
  name: string
  address: string
  status: ServerStatus
}

export const mcpServers = request('mcp.servers', { input: () => z.object({}), output: type<ServerState[]>() })

export const mcpServersWire = wireEvent<ServerState[]>('mcp.servers')
