import type { Runtimes, RuntimeView } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/util'
import type { Handlers } from '@sand/util/wire'
import { answer, type Client } from './client'
import { type ClientMessage, hello } from './contract'
import { route } from './route'
import type { Upstream } from './upstream'

const waitTimeout = 60_000
const focusType = 'ui.focus'

interface ReceiveOptions {
  runtimes: Runtimes
  handlers: Handlers
  upstream(client: Client, runtime: RuntimeView): Upstream
}

const parse = (raw: string) => {
  const request = JSON.parse(raw) as ClientMessage
  if (typeof request?.id !== 'number' || typeof request.type !== 'string') throw new Error('the request has no id or type')
  return request
}

const local = async (client: Client, request: ClientMessage, handlers: Handlers) => {
  try {
    answer(client, request.id, { result: await handlers.answer(request.type, request.input, client.caller) })
  } catch (error) {
    answer(client, request.id, { error: errorMessage(error) })
  }
}

export const createReceiver = ({ runtimes, handlers, upstream }: ReceiveOptions) => {
  let copies = 0

  const target = (request: ClientMessage) => route(request, runtimes.live(), runtimes.current())

  const focus = (client: Client, request: ClientMessage, chosen: RuntimeView) => {
    for (const runtime of runtimes.live()) {
      if (runtime.id === chosen.id) continue
      upstream(client, runtime).send(JSON.stringify({ ...request, id: --copies }))
    }
  }

  const forward = async (client: Client, request: ClientMessage, raw: string) => {
    let runtime = target(request)
    if (!runtime) {
      await runtimes.wait(waitTimeout)
      runtime = target(request)
    }
    if (!client.open) return
    if (!runtime) return answer(client, request.id, { error: 'sand is not running a runtime right now' })
    client.waiting.set(request.id, runtime.id)
    if (request.type === hello.id) client.hellos.add(request.id)
    upstream(client, runtime).send(raw)
    if (request.type === focusType) focus(client, request, runtime)
  }

  return (client: Client, raw: string) => {
    let request: ClientMessage
    try {
      request = parse(raw)
    } catch (error) {
      return console.error(`hub dropped a malformed frame: ${errorMessage(error)}`)
    }
    if (handlers.has(request.type)) return void local(client, request, handlers)
    client.queue = client.queue
      .then(() => forward(client, request, raw))
      .catch(error => console.error(`hub could not forward ${request.type}: ${errorMessage(error)}`))
  }
}
