export interface SseFrame {
  event?: string
  data: string
}

const boundary = /\r?\n\r?\n/

const fieldOf = (line: string, name: string) => (line.startsWith(`${name}:`) ? line.slice(name.length + 1).trimStart() : undefined)

const frameOf = (text: string): SseFrame | undefined => {
  const lines = text.split(/\r?\n/)
  const event = lines.map(line => fieldOf(line, 'event')).findLast(found => found !== undefined)
  const data = lines
    .map(line => fieldOf(line, 'data'))
    .filter(found => found !== undefined)
    .join('\n')
    .trim()
  if (!data && event === undefined) return undefined
  return event === undefined ? { data } : { event, data }
}

async function* sseFrames(body: AsyncIterable<Uint8Array>): AsyncIterable<SseFrame> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let match = boundary.exec(buffer); match; match = boundary.exec(buffer)) {
      const frame = frameOf(buffer.slice(0, match.index))
      buffer = buffer.slice(match.index + match[0].length)
      if (frame) yield frame
    }
  }
  const rest = frameOf(buffer + decoder.decode())
  if (rest) yield rest
}

export { sseFrames }
