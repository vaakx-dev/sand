const boundary = /\r?\n\r?\n/

const dataOf = (frame: string) =>
  frame
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')
    .trim()

const parse = (frame: string, name: string) => {
  const data = dataOf(frame)
  if (!data || data === '[DONE]') return undefined
  try {
    return JSON.parse(data)
  } catch {
    throw new Error(`${name} sent invalid stream data: ${data.slice(0, 200)}`)
  }
}

export async function* frames(body: ReadableStream<Uint8Array>, name = 'ChatGPT'): AsyncIterable<any> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let match = boundary.exec(buffer); match; match = boundary.exec(buffer)) {
      const event = parse(buffer.slice(0, match.index), name)
      buffer = buffer.slice(match.index + match[0].length)
      if (event) yield event
    }
  }
  const rest = parse(buffer + decoder.decode(), name)
  if (rest) yield rest
}
