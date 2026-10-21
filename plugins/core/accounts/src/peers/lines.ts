import type { LLMEvent } from '../contract'
import { AccountError, rawMessage } from '../errors'
import type { ShareLine } from '../share/info'

const read = async (reader: ReadableStreamDefaultReader<Uint8Array>, name: string, signal?: AbortSignal) => {
  try {
    return await reader.read()
  } catch (error) {
    if (signal?.aborted) throw error
    throw new AccountError(`Lost the connection to ${name} during the reply`, rawMessage(error))
  }
}

async function* lines(body: ReadableStream<Uint8Array>, name: string, signal?: AbortSignal) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await read(reader, name, signal)
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const line = buffer.slice(0, end).trim()
        buffer = buffer.slice(end + 1)
        if (line) yield line
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

export async function* readEvents(body: ReadableStream<Uint8Array>, name: string, signal?: AbortSignal): AsyncGenerator<LLMEvent> {
  let finished = false
  for await (const text of lines(body, name, signal)) {
    const line: ShareLine = JSON.parse(text)
    if (line.type === 'ping') continue
    if (line.type === 'error') throw new AccountError(`On ${name}: ${line.message}`, line.detail)
    if (line.type === 'done') finished = true
    yield line
  }
  if (!finished && !signal?.aborted) throw new AccountError(`${name} stopped before the reply finished`)
}
