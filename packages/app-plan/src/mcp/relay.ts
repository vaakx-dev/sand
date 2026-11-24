const BRIDGE_URL = process.env.SAND_MCP_URL ?? ''
const AUTHORIZATION = `Bearer ${process.env.SAND_MCP_TOKEN ?? ''}`
const NO_REPLY = 204

const relay = async (line: string) => {
  const response = await fetch(BRIDGE_URL, { method: 'POST', headers: { Authorization: AUTHORIZATION, 'Content-Type': 'application/json' }, body: line })
  if (response.status !== NO_REPLY) process.stdout.write(`${await response.text()}\n`)
}

const lines = async function* (stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
      const line = buffer.slice(0, at).trim()
      buffer = buffer.slice(at + 1)
      if (line) yield line
    }
  }
}

for await (const line of lines(Bun.stdin.stream())) void relay(line)
