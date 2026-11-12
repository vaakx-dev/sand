import type { Reply } from './contract'

type Event = Record<string, unknown> & { type: string }

interface Played {
  out: Event[]
  end: 'close' | 'hold' | 'drop'
}

const frame = (event: Event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`

const block = (index: number, start: Record<string, unknown>, deltas: Record<string, unknown>[]): Event[] => [
  { type: 'content_block_start', index, content_block: start },
  ...deltas.map(delta => ({ type: 'content_block_delta', index, delta })),
  { type: 'content_block_stop', index },
]

const events = (reply: Reply, model: string, ids: () => string): Played => {
  const out: Event[] = [{ type: 'message_start', message: { model, usage: { input_tokens: 0, output_tokens: 0 } } }]
  let calls = false
  for (const [index, part] of reply.entries()) {
    switch (part.type) {
      case 'text':
        out.push(...block(index, { type: 'text', text: '' }, [{ type: 'text_delta', text: part.text }]))
        break
      case 'thinking':
        out.push(
          ...block(index, { type: 'thinking', thinking: '' }, [
            { type: 'thinking_delta', thinking: part.text },
            { type: 'signature_delta', signature: 'replay' },
          ]),
        )
        break
      case 'call':
        calls = true
        out.push(
          ...block(index, { type: 'tool_use', id: part.id ?? ids(), name: part.name }, [{ type: 'input_json_delta', partial_json: JSON.stringify(part.input) }]),
        )
        break
      case 'usage':
        out.push({ type: 'message_delta', usage: { input_tokens: part.input, output_tokens: part.output } })
        break
      case 'error':
        out.push({ type: 'error', error: { type: 'invalid_request_error', message: part.message } })
        return { out, end: 'close' }
      case 'hold':
        return { out, end: 'hold' }
      case 'drop':
        return { out, end: 'drop' }
    }
  }
  out.push({ type: 'message_delta', delta: { stop_reason: calls ? 'tool_use' : 'end_turn' } }, { type: 'message_stop' })
  return { out, end: 'close' }
}

export const anthropicStream = (reply: Reply, model: string, ids: () => string) => {
  const { out, end } = events(reply, model, ids)
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      out.forEach(event => controller.enqueue(encoder.encode(frame(event))))
      if (end === 'close') controller.close()
      if (end === 'drop') setTimeout(() => controller.error(new Error('replay dropped the connection')))
    },
  })
}
