const boundary = /\r?\n\r?\n/

const dataOf = (frame: string) =>
  frame
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')
    .trim()

const parse = <T>(frame: string, name: string): T | undefined => {
  const data = dataOf(frame)
  if (!data || data === '[DONE]') return undefined
  try {
    return JSON.parse(data)
  } catch {
    throw new Error(`${name} sent invalid stream data: ${data.slice(0, 200)}`)
  }
}

export async function* sseEvents<T>(body: ReadableStream<Uint8Array>, name: string): AsyncIterable<T> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let match = boundary.exec(buffer); match; match = boundary.exec(buffer)) {
      const event = parse<T>(buffer.slice(0, match.index), name)
      buffer = buffer.slice(match.index + match[0].length)
      if (event) yield event
    }
  }
  const rest = parse<T>(buffer + decoder.decode(), name)
  if (rest) yield rest
}
