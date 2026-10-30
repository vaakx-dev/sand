import type { Caller, Request, RequestHandler } from '@sand/host-hub/contract'
import { callerAllowed } from './callers'
import { parseInput } from './input'

interface Entry {
  request: Request<unknown, unknown>
  handler: RequestHandler<unknown, unknown>
}

export const createHandlers = () => {
  const entries = new Map<string, Entry>()

  const handle = <I, O>(request: Request<I, O>, handler: RequestHandler<I, O>) => {
    const entry = { request, handler } as Entry
    entries.set(request.id, entry)
    return () => {
      if (entries.get(request.id) === entry) entries.delete(request.id)
    }
  }

  const has = (type: string) => entries.has(type)

  const answer = async (type: string, input: unknown, caller: Caller) => {
    const entry = entries.get(type)
    if (!entry) throw new Error(`Nothing answers ${type}`)
    if (!callerAllowed(entry.request.callers, caller.kind)) throw new Error(`A ${caller.kind} can't ask for ${type}`)
    return entry.handler(await parseInput(entry.request, input), caller)
  }

  return { handle, has, answer }
}

export type Handlers = ReturnType<typeof createHandlers>
