const BRIDGE_URL = process.env.SAND_MCP_URL ?? ''
const BRIDGE_TOKEN = process.env.SAND_MCP_TOKEN ?? ''
const SERVER_INFO = { name: 'sand', version: '1.0.0' }
const DEFAULT_PROTOCOL = '2025-06-18'

type Json = Record<string, unknown>

function fieldsOf(value: unknown): Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : {}
}

function writeResponse(payload: Json) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

async function fetchBridge(path: string, body?: Json): Promise<Json> {
  const response = await fetch(`${BRIDGE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
  })
  if (!response.ok) throw new Error(`sand tool bridge error (${response.status}): ${await response.text()}`)
  return fieldsOf(await response.json())
}

async function handleMethod(method: string, params: Json): Promise<Json | undefined> {
  if (method === 'initialize') {
    const protocolVersion = typeof params.protocolVersion === 'string' ? params.protocolVersion : DEFAULT_PROTOCOL
    return { protocolVersion, capabilities: { tools: {} }, serverInfo: SERVER_INFO }
  }
  if (method === 'ping') return {}
  if (method === 'tools/list') return fetchBridge('/tools')
  if (method === 'tools/call') return fetchBridge('/call', { name: params.name, arguments: fieldsOf(params.arguments) })
  return undefined
}

async function handleMessage(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return
  let message: Json
  try {
    message = fieldsOf(JSON.parse(trimmed))
  } catch {
    return
  }
  const id = message.id
  if (id === undefined) return
  const method = typeof message.method === 'string' ? message.method : ''
  try {
    const result = await handleMethod(method, fieldsOf(message.params))
    if (result !== undefined) {
      writeResponse({ jsonrpc: '2.0', id, result })
      return
    }
    writeResponse({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    writeResponse({ jsonrpc: '2.0', id, error: { code: -32000, message: text } })
  }
}

async function main() {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true })
    for (;;) {
      const newline = buffer.indexOf('\n')
      if (newline < 0) break
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      void handleMessage(line)
    }
  }
  if (buffer.trim()) await handleMessage(buffer)
}

void main()
