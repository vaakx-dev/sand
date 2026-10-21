import type { ClientMessage } from '@sand/host-hub/contract'
import { isRecord } from '@sand/util'
import { join } from 'node:path'
import { createInbound } from './inbound'
import { createOutbound } from './outbound'
import { blobRoute } from './route'
import { createBlobStore } from './store'
import { scheduleSweep } from './sweep'

type Entries = (session: string) => unknown

const sessionOf = (input: unknown) => (isRecord(input) && typeof input.session === 'string' ? input.session : undefined)

export const createBlobs = (home: string, entries: Entries, report: (error: unknown) => void) => {
  const folder = join(home, 'blobs')
  const store = createBlobStore(folder, report)
  const outbound = createOutbound(store)
  const recovering = new Map<string, Promise<void>>()
  const inline = new Set<string>()

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

  const find = async (hash: string, session?: string | null) => {
    const file = await store.file(hash)
    if (file || !session) return file
    await recover(session)
    return store.file(hash)
  }

  const inbound = createInbound(find)

  return {
    route: blobRoute(find),
    outbound,
    sweep: () => scheduleSweep(store, folder, report),
    inline(type: string) {
      inline.add(type)
      return () => void inline.delete(type)
    },
    async answer(request: ClientMessage, run: (input: unknown) => Promise<unknown>) {
      const result = await run(await inbound(request.input, sessionOf(request.input)))
      return inline.has(request.type) ? result : outbound(result)
    },
  }
}
