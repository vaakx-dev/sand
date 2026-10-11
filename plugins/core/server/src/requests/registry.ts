import type { RequestHandler, WireHandler, WireHandlers, WireRequest, WireRequestType } from '@sand/protocol'
import { joinDisposers } from '@sand/kit'
import type { Dispose } from 'drydock'

type Handler = (request: never) => unknown

export const createRequests = () => {
  const handlers = new Map<string, Handler>()

  const handleOne = (type: string, handler: Handler) => {
    handlers.set(type, handler)
    return () => {
      if (handlers.get(type) === handler) handlers.delete(type)
    }
  }

  function handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
  function handle(type: string, handler: RequestHandler): Dispose
  function handle(handlers: WireHandlers): Dispose
  function handle(type: string | WireHandlers, handler?: Handler) {
    if (typeof type === 'string') return handler ? handleOne(type, handler) : () => {}
    return joinDisposers(...Object.entries(type).map(([name, each]) => handleOne(name, each)))
  }

  const answer = async (request: WireRequest) => {
    const handler = handlers.get(request.type)
    if (!handler) throw new Error(`The server has no handler for ${request.type}`)
    return handler(request as never)
  }

  return { handle, answer }
}
