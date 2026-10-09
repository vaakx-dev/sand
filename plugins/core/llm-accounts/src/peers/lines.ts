import type { LLMEvent } from '@sand/protocol'
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

async function* split(body: ReadableStream<Uint8Array>, name: string, signal?: AbortSignal) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await read(reader, name, signal)
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let end: number
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim()
        buffer = buffer.slice(end + 1)
        if (line) yield JSON.parse(line) as ShareLine
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

export async function* readEvents(body: ReadableStream<Uint8Array>, name: string, signal?: AbortSignal): AsyncGenerator<LLMEvent> {
  let finished = false
  for await (const line of split(body, name, signal)) {
    if (line.type === 'ping') continue
    if (line.type === 'error') throw new AccountError(`On ${name}: ${line.message}`, line.detail)
    if (line.type === 'done') finished = true
    yield line
  }
  if (!finished && !signal?.aborted) throw new AccountError(`${name} stopped before the reply finished`)
}
