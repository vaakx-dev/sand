import type { ToolSpec } from '@sand/accounts/contract'
import type { Media } from '@sand/media/contract'
import { expect, test } from 'bun:test'
import { mcpBridge } from '../src'

const IMAGE_DATA = 'aW1hZ2U='

const media: Media = {
  put: () => ({ hash: 'h', size: 1, mediaType: 'image/png' }),
  path: () => '',
  data: () => IMAGE_DATA,
  exclude() {},
  include() {},
  inUse: () => () => {},
}

const tools: ToolSpec[] = [{ name: 'look', description: 'Look at something', inputSchema: { type: 'object' } }]

const replies = async function* (stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
      yield JSON.parse(buffer.slice(0, at))
      buffer = buffer.slice(at + 1)
    }
  }
}

test('an app talking MCP over stdio lists sand’s tools and gets each call’s result, and notifications get no reply', async () => {
  const calls: unknown[] = []
  const bridge = mcpBridge({
    tools,
    media,
    async call({ name, input }) {
      calls.push({ name, input })
      return { type: 'tool_result', callId: 'one', content: [{ type: 'text', text: 'seen' }, { type: 'image', mediaType: 'image/png', hash: 'h', size: 1 }] }
    },
  })
  const { command, args, env } = bridge.server
  const child = Bun.spawn([command, ...args], { env: { ...process.env, ...Object.fromEntries(env.map(({ name, value }) => [name, value])) }, stdin: 'pipe', stdout: 'pipe' })
  const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`)
  try {
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
    send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'look', arguments: { at: 'sky' } } })
    send({ jsonrpc: '2.0', id: 4, method: 'resources/list' })
    await child.stdin.flush()

    const byId = new Map<number, Record<string, unknown>>()
    for await (const reply of replies(child.stdout)) {
      byId.set(reply.id, reply)
      if (byId.size === 4) break
    }

    expect(byId.get(1)).toMatchObject({ result: { protocolVersion: '2025-06-18', serverInfo: { name: 'sand' } } })
    expect(byId.get(2)).toMatchObject({ result: { tools: [{ name: 'look', description: 'Look at something' }] } })
    expect(byId.get(3)).toMatchObject({ result: { isError: false, content: [{ type: 'text', text: 'seen' }, { type: 'image', data: IMAGE_DATA, mimeType: 'image/png' }] } })
    expect(byId.get(4)).toMatchObject({ error: { code: -32601 } })
    expect(calls).toEqual([{ name: 'look', input: { at: 'sky' } }])
  } finally {
    child.kill()
    bridge.close()
  }
})
