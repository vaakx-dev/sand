import type { RequestHandler, Runtimes, RuntimeView } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { answer, type Client } from './client'
import { type ClientFrame, promptKey, route } from './route'
import type { Upstream } from './upstream'

const waitTimeout = 60_000

export interface ReceiveOptions {
  runtimes: Runtimes
  handlers: Map<string, RequestHandler>
  upstream(client: Client, runtime: RuntimeView): Upstream
}

const parse = (raw: string) => {
  const request = JSON.parse(raw) as ClientFrame
  if (typeof request?.id !== 'number' || typeof request.type !== 'string') throw new Error('the request has no id or type')
  return request
}

const local = async (client: Client, request: ClientFrame, handler: RequestHandler) => {
  try {
    answer(client, request.id, { result: await handler(request) })
  } catch (error) {
    answer(client, request.id, { error: errorMessage(error) })
  }
}

export const createReceiver = ({ runtimes, handlers, upstream }: ReceiveOptions) => {
  let copies = 0

  const target = (client: Client, request: ClientFrame) =>
    route(request, runtimes.live(), runtimes.current(), client.prompts)

  const focus = (client: Client, request: ClientFrame, chosen: RuntimeView) => {
    for (const runtime of runtimes.live()) {
      if (runtime.id === chosen.id) continue
      upstream(client, runtime).send(JSON.stringify({ ...request, id: --copies }))
    }
  }

  const forward = async (client: Client, request: ClientFrame, raw: string) => {
    let runtime = target(client, request)
    if (!runtime) {
      await runtimes.wait(waitTimeout)
      runtime = target(client, request)
    }
    if (!client.open) return
    if (!runtime) return answer(client, request.id, { error: 'sand is not running a runtime right now' })
    const key = promptKey(request)
    if (typeof key === 'string') client.prompts.delete(key)
    client.waiting.set(request.id, runtime.id)
    if (request.type === 'hello') client.hellos.add(request.id)
    upstream(client, runtime).send(raw)
    if (request.type === 'ui.focus') focus(client, request, runtime)
  }

  return (client: Client, raw: string) => {
    let request: ClientFrame
    try {
      request = parse(raw)
    } catch (error) {
      return console.error(`hub dropped a malformed frame: ${errorMessage(error)}`)
    }
    const handler = handlers.get(request.type)
    if (handler) return void local(client, request, handler)
    client.queue = client.queue
      .then(() => forward(client, request, raw))
      .catch(error => console.error(`hub could not forward ${request.type}: ${errorMessage(error)}`))
  }
}
