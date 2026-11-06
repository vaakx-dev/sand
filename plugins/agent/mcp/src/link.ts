import { Client, type CallToolResult, type RequestOptions, type Tool } from '@modelcontextprotocol/client'
import { errorMessage } from '@sand/util'
import type { ServerConfig } from './config'
import type { ServerStatus } from './contract'
import { open } from './transport'

const retryDelays = [1_000, 2_000, 5_000, 15_000, 60_000]

export interface LinkEvents {
  listed(tools: Tool[]): void
  changed(): void
  report(error: unknown): void
}

export const openLink = (name: string, config: ServerConfig, events: LinkEvents) => {
  let client: Client | undefined
  let status: ServerStatus = { state: 'connecting' }
  let failures = 0
  let timer: Timer | undefined
  let closed = false

  const set = (next: ServerStatus) => {
    status = next
    events.changed()
  }

  const retry = (error: unknown) => {
    client = undefined
    if (closed) return
    const delay = retryDelays[Math.min(failures++, retryDelays.length - 1)]
    set({ state: 'failed', error: errorMessage(error) })
    timer = setTimeout(connect, delay)
  }

  const listChanged = {
    tools: { onChanged: (error: Error | null, tools: Tool[] | null) => (error ? events.report(error) : tools && events.listed(tools)) },
  }

  async function connect() {
    set({ state: 'connecting' })
    const next = new Client({ name: 'sand', version: '1.0.0' }, { listChanged })
    try {
      const { transport, lastLog } = open(config)
      next.onclose = () => client === next && retry(new Error(['The server closed the connection', lastLog()].filter(Boolean).join(': ')))
      await next.connect(transport)
      const { tools } = await next.listTools()
      if (closed) return void next.close()
      client = next
      failures = 0
      events.listed(tools)
      set({ state: 'ready' })
    } catch (error) {
      void next.close()
      retry(error)
    }
  }

  const unavailable = () =>
    status.state === 'failed' ? `The ${name} MCP server is not connected: ${status.error}. sand reconnects on its own; try again later.` : `The ${name} MCP server is still connecting; try again shortly.`

  void connect()

  return {
    status: () => status,
    call(tool: string, input: Record<string, unknown>, options: RequestOptions): Promise<CallToolResult> {
      if (!client) throw new Error(unavailable())
      return client.callTool({ name: tool, arguments: input }, options)
    },
    close() {
      closed = true
      clearTimeout(timer)
      void client?.close()
      client = undefined
    },
  }
}

export type Link = ReturnType<typeof openLink>
