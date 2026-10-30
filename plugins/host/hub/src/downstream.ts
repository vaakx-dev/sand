import type { Runtimes, RuntimeView } from '@sand/host-runtimes/contract'
import { type Client, send } from './client'
import type { Hello } from './contract'
import { peek } from './frames'
import type { Greetings } from './greetings'
import { mergeHello } from './hello'

const currentOnly = new Set(['web.build', 'skills.change', 'models.change'])

export const createDownstream = (runtimes: Runtimes, greetings: Pick<Greetings, 'values'>) => {
  const helloResult = (raw: string, client: Client, runtime: RuntimeView) => {
    const message = JSON.parse(raw) as { error?: string; result?: Hello }
    if (message.error !== undefined || !message.result) return raw
    const others = runtimes.live().filter(other => other.id !== runtime.id)
    return JSON.stringify({ ...message, result: mergeHello(message.result, others, greetings.values(client)) })
  }

  return (client: Client, runtime: RuntimeView, raw: string) => {
    if (!client.open) return
    const frame = peek(raw)
    if (!frame) return console.error(`hub dropped a malformed frame from runtime ${runtime.id}`)
    if (frame.type === 'result') {
      if (frame.id < 0) return
      client.waiting.delete(frame.id)
      return send(client, client.hellos.delete(frame.id) ? helloResult(raw, client, runtime) : raw)
    }
    if (currentOnly.has(frame.name) && runtimes.current()?.id !== runtime.id) return
    send(client, raw)
  }
}
