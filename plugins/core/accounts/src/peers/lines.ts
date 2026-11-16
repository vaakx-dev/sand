import { type LLMEvent, ProviderTrouble, RequestRejected, ThreadLost, UsageLimited } from '../contract'
import { AccountError } from '../errors'
import type { ShareLine } from '../share/info'

type ErrorLine = Extract<ShareLine, { type: 'error' }>

export interface Reading {
  name: string
  signal?: AbortSignal
  dropped(text: string, cause?: unknown): Error
}

const read = async (reader: ReadableStreamDefaultReader<Uint8Array>, { name, signal, dropped }: Reading) => {
  try {
    return await reader.read()
  } catch (error) {
    if (signal?.aborted) throw error
    throw dropped(`Lost the connection to ${name} during the reply`, error)
  }
}

async function* lines(body: ReadableStream<Uint8Array>, reading: Reading) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await read(reader, reading)
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

const failureOf = ({ message, detail, kind, waitMs, resetsAt }: ErrorLine, name: string) => {
  const text = `On ${name}: ${message}`
  switch (kind) {
    case 'lost':
      return new ThreadLost(text)
    case 'trouble':
      return new ProviderTrouble(text, waitMs)
    case 'limited':
      return new UsageLimited(text, resetsAt)
    case 'rejected':
      return new RequestRejected(text)
    default:
      return new AccountError(text, detail)
  }
}

export async function* readEvents(body: ReadableStream<Uint8Array>, reading: Reading): AsyncGenerator<LLMEvent> {
  const { name, signal, dropped } = reading
  let finished = false
  for await (const text of lines(body, reading)) {
    const line: ShareLine = JSON.parse(text)
    if (line.type === 'ping') continue
    if (line.type === 'error') throw failureOf(line, name)
    if (line.type === 'done') finished = true
    yield line
  }
  if (!finished && !signal?.aborted) throw dropped(`${name} stopped before the reply finished`)
}
