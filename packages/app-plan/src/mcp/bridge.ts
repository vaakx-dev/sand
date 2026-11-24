import { join } from 'node:path'
import { fieldsOf } from '../json'
import { mcpServer, SERVER_NAME, type McpTools } from './server'

interface StdioServer {
  name: string
  command: string
  args: string[]
  env: Array<{ name: string; value: string }>
}

interface Bridge {
  server: StdioServer
  close(): void
}

const RELAY = join(import.meta.dir, 'relay.ts')
const LOOPBACK = '127.0.0.1'

const mcpBridge = (tools: McpTools): Bridge => {
  const serve = mcpServer(tools)
  const token = crypto.randomUUID()
  const authorized = `Bearer ${token}`

  const http = Bun.serve({
    hostname: LOOPBACK,
    port: 0,
    idleTimeout: 0,
    async fetch(request) {
      if (request.headers.get('authorization') !== authorized) return new Response('Unauthorized', { status: 401 })
      const reply = await serve(fieldsOf(await request.json().catch(() => undefined)))
      return reply ? Response.json(reply) : new Response(null, { status: 204 })
    },
  })

  return {
    server: {
      name: SERVER_NAME,
      command: process.execPath,
      args: [RELAY],
      env: [
        { name: 'SAND_MCP_URL', value: `http://${LOOPBACK}:${http.port}` },
        { name: 'SAND_MCP_TOKEN', value: token },
      ],
    },
    close: () => void http.stop(true),
  }
}

export { mcpBridge }
