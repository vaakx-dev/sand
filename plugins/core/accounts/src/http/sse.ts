import { sseFrames } from '@sand/util'

const parse = <T>(data: string, name: string): T | undefined => {
  if (!data || data === '[DONE]') return undefined
  try {
    return JSON.parse(data)
  } catch {
    throw new Error(`${name} sent invalid stream data: ${data.slice(0, 200)}`)
  }
}

export async function* sseEvents<T>(body: ReadableStream<Uint8Array>, name: string): AsyncIterable<T> {
  for await (const { data } of sseFrames(body)) {
    const event = parse<T>(data, name)
    if (event) yield event
  }
}
