import type { Runtimes, RuntimeView } from '@sand/host-runtimes/contract'
import type { Hello } from '@sand/protocol'
import { type Client, send } from './client'
import { passes } from './filter'
import { peek } from './frames'
import { mergeHello } from './hello'

const prompting = new Set(['ui.pick', 'ui.input'])

const helloResult = (raw: string, runtime: RuntimeView, runtimes: Runtimes) => {
  const message = JSON.parse(raw) as { error?: string; result?: Hello }
  if (message.error !== undefined || !message.result) return raw
  const others = runtimes.live().filter(other => other.id !== runtime.id)
  return JSON.stringify({ ...message, result: mergeHello(message.result, others) })
}

const promptId = (raw: string) => {
  const message = JSON.parse(raw) as { args?: [{ id?: unknown }?] }
  const id = message.args?.[0]?.id
  return typeof id === 'string' ? id : undefined
}

export const createDownstream = (runtimes: Runtimes) => (client: Client, runtime: RuntimeView, raw: string) => {
  if (!client.open) return
  const frame = peek(raw)
  if (!frame) return console.error(`hub dropped a malformed frame from runtime ${runtime.id}`)
  if (frame.type === 'result') {
    if (frame.id < 0) return
    client.waiting.delete(frame.id)
    return send(client, client.hellos.delete(frame.id) ? helloResult(raw, runtime, runtimes) : raw)
  }
  if (!passes(frame.name, runtimes.current()?.id === runtime.id)) return
  if (prompting.has(frame.name)) {
    const id = promptId(raw)
    if (id) client.prompts.set(id, runtime.id)
  }
  send(client, raw)
}
