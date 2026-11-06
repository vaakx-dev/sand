const lineBreak = /\r\n|\r|\n/

const emit = (lines: string[], onLine: (line: string) => void) => {
  for (const line of lines) if (line.trim()) onLine(line)
}

export const readStream = async (stream: ReadableStream<Uint8Array>, onLine?: (line: string) => void) => {
  if (!onLine) return new Response(stream).text()
  const decoder = new TextDecoder()
  let full = ''
  let rest = ''
  for await (const chunk of stream) {
    const text = decoder.decode(chunk, { stream: true })
    full += text
    const lines = (rest + text).split(lineBreak)
    rest = lines.pop() ?? ''
    emit(lines, onLine)
  }
  const tail = decoder.decode()
  emit([rest + tail], onLine)
  return full + tail
}
