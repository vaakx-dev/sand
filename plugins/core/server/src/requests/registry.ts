import type { RequestHandler, WireHandler, WireHandlers, WireRequest, WireRequestType } from '@sand/protocol'
import { joinDisposers } from '@sand/kit'
import type { Dispose } from 'drydock'

export const createRequests = () => {
  const handlers = new Map<string, RequestHandler>()

  const handleOne = (type: string, handler: RequestHandler) => {
    handlers.set(type, handler)
    return () => {
      if (handlers.get(type) === handler) handlers.delete(type)
    }
  }

  const handleAll = (all: WireHandlers) => joinDisposers(...Object.entries(all).map(([type, handler]) => handleOne(type, handler as RequestHandler)))

  function handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
  function handle(type: string, handler: RequestHandler): Dispose
  function handle(handlers: WireHandlers): Dispose
  function handle(type: string | WireHandlers, handler?: (request: never) => unknown) {
    if (typeof type !== 'string') return handleAll(type)
    return handleOne(type, handler as RequestHandler)
  }

  const answer = async (request: WireRequest) => {
    const handler = handlers.get(request.type)
    if (!handler) throw new Error(`The server has no handler for ${request.type}`)
    return handler(request as Parameters<RequestHandler>[0])
  }

  return { handle, answer }
}
