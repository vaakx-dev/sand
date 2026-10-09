import type { RequestHandler, WireHandler, WireRequest, WireRequestType } from '@sand/protocol'
import type { Dispose } from 'drydock'

export type CoreHandlers = { [K in WireRequestType]?: WireHandler<K> }

export const createRequests = () => {
  const handlers = new Map<string, RequestHandler>()

  function handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
  function handle(type: string, handler: RequestHandler): Dispose
  function handle(type: string, handler: (request: never) => unknown) {
    const entry = handler as RequestHandler
    handlers.set(type, entry)
    return () => {
      if (handlers.get(type) === entry) handlers.delete(type)
    }
  }

  const register = (core: CoreHandlers) => {
    const disposers = Object.entries(core).map(([type, handler]) => handle(type, handler as RequestHandler))
    return () => disposers.forEach(dispose => dispose())
  }

  const answer = async (request: WireRequest) => {
    const handler = handlers.get(request.type)
    if (!handler) throw new Error(`The server has no handler for ${request.type}`)
    return handler(request as Parameters<RequestHandler>[0])
  }

  return { handle, register, answer }
}
