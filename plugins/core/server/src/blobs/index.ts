import type { WireRequest } from '@sand/protocol'
import { join } from 'node:path'
import { createInbound } from './inbound'
import { createOutbound } from './outbound'
import { blobPath, blobRoute } from './route'
import { createBlobStore } from './store'
import { scheduleSweep } from './sweep'

type Entries = (session: string) => unknown

const sessionOf = (request: WireRequest) => {
  const { session } = request as { session?: unknown }
  return typeof session === 'string' ? session : undefined
}

export const createBlobs = (home: string, entries: Entries, report: (error: unknown) => void) => {
  const folder = join(home, 'blobs')
  const store = createBlobStore(folder, report)
  const outbound = createOutbound(store)
  const recovering = new Map<string, Promise<void>>()
  const recover = (session: string) => {
    const running = recovering.get(session)
    if (running) return running
    const run = Promise.resolve()
      .then(() => void outbound(entries(session)))
      .catch(report)
      .finally(() => recovering.delete(session))
    recovering.set(session, run)
    return run
  }
  const inbound = createInbound(store, recover)
  const inline = new Set<string>()

  return {
    path: blobPath,
    route: blobRoute(store, recover),
    outbound,
    sweep: () => scheduleSweep(store, folder, report),
    inline(type: string) {
      inline.add(type)
      return () => void inline.delete(type)
    },
    async answer(request: WireRequest, run: (request: WireRequest) => Promise<unknown>) {
      const result = await run(await inbound(request, sessionOf(request)))
      return inline.has(request.type) ? result : outbound(result)
    },
  }
}
