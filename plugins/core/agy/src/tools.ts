import type { ToolSpec } from '@sand/accounts/contract'
import type { ToolResultBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { join } from 'node:path'
import { fieldsOf, type Json } from './acp'
import { toolResultPayload } from './content'

const SERVER_NAME = 'sand'
const BRIDGE_SCRIPT = join(import.meta.dir, 'mcp-bridge.ts')

interface AcpStdioServer {
  name: string
  command: string
  args: string[]
  env: Array<{ name: string; value: string }>
}

interface ToolBridge {
  mcpServer: AcpStdioServer
  close(): void
}

type ToolCallHandler = (name: string, input: Json) => Promise<ToolResultBlock>

function listedTools(tools: ToolSpec[]) {
  return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
}

function startToolBridge(tools: ToolSpec[], media: Media, onCall: ToolCallHandler): ToolBridge {
  const token = crypto.randomUUID()
  const expectedAuth = `Bearer ${token}`
  const toolList = listedTools(tools)

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    idleTimeout: 0,
    async fetch(request) {
      if (request.headers.get('authorization') !== expectedAuth) {
        return new Response('Unauthorized', { status: 401 })
      }
      const { pathname } = new URL(request.url)
      if (request.method === 'GET' && pathname === '/tools') {
        return Response.json({ tools: toolList })
      }
      if (request.method === 'POST' && pathname === '/call') {
        const body = fieldsOf(await request.json().catch(() => ({})))
        const name = typeof body.name === 'string' ? body.name : ''
        const input = fieldsOf(body.arguments)
        const result = await onCall(name, input)
        return Response.json(toolResultPayload(result, media))
      }
      return new Response('Not found', { status: 404 })
    },
  })

  const mcpServer: AcpStdioServer = {
    name: SERVER_NAME,
    command: process.execPath,
    args: [BRIDGE_SCRIPT],
    env: [
      { name: 'SAND_MCP_URL', value: `http://127.0.0.1:${server.port}` },
      { name: 'SAND_MCP_TOKEN', value: token },
    ],
  }

  return {
    mcpServer,
    close() {
      server.stop(true)
    },
  }
}

export { SERVER_NAME, startToolBridge }
export type { AcpStdioServer, ToolBridge }
