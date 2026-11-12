import type { Caller, Hub, HubSocket, Request, ServerMessage } from '@sand/host-hub/contract'
import { failure } from '@sand/orchestrator/contract'
import type { Use } from '../server'

const defaultTimeout = 30_000

interface Waiter {
  resolve(result: unknown): void
  reject(error: Error): void
  timer: Timer
}

const openLink = (hub: Hub, caller: Caller) => {
  const waiting = new Map<number, Waiter>()
  let next = 0

  const take = (id: number) => {
    const waiter = waiting.get(id)
    waiting.delete(id)
    if (waiter) clearTimeout(waiter.timer)
    return waiter
  }

  const shut = () => {
    for (const id of [...waiting.keys()]) take(id)?.reject(failure('unavailable', 'sand closed the connection'))
  }

  const socket: HubSocket = {
    send(data) {
      const message: ServerMessage = JSON.parse(data)
      if (message.type !== 'result') return data.length
      const waiter = take(message.id)
      if (message.error === undefined) waiter?.resolve(message.result)
      else waiter?.reject(new Error(message.error))
      return data.length
    },
    close: shut,
    terminate: shut,
  }
  hub.open(socket, caller)

  return {
    call: <I, O>(request: Request<I, O>, input: I, { timeout = defaultTimeout } = {}) =>
      new Promise<O>((resolve, reject) => {
        const id = ++next
        const timer = setTimeout(() => take(id)?.reject(failure('unavailable', `sand did not answer ${request.id} in time`)), timeout)
        waiting.set(id, { resolve: result => resolve(result as O), reject, timer })
        hub.message(socket, JSON.stringify({ type: request.id, id, input }))
      }),
    close() {
      hub.close(socket)
      shut()
    },
  }
}

export const hubUse =
  (hub: Hub, caller: Caller): Use =>
  async work => {
    const link = openLink(hub, caller)
    try {
      return await work(link.call)
    } finally {
      link.close()
    }
  }
