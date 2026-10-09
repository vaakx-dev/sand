const boundary = /\r?\n\r?\n/

const parse = (raw: string) =>
  raw
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')

export async function* events(body: ReadableStream<Uint8Array>): AsyncIterable<any> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let match = boundary.exec(buffer); match; match = boundary.exec(buffer)) {
      const data = parse(buffer.slice(0, match.index))
      buffer = buffer.slice(match.index + match[0].length)
      if (data) yield JSON.parse(data)
    }
  }
}
