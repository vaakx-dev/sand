import type { Runtimes, RuntimeView } from '@sand/host-runtimes/contract'
import { type Client, fail } from './client'
import { createUpstream } from './upstream'

export type Downstream = (client: Client, runtime: RuntimeView, raw: string) => void

export const createLinks = (runtimes: Runtimes, downstream: Downstream) => {
  const isLive = (id: string) => runtimes.live().some(runtime => runtime.id === id)

  const connect = (client: Client, runtime: RuntimeView) => {
    const upstream = createUpstream(runtime, {
      message: raw => downstream(client, runtime, raw),
      lost: () => fail(client, runtime.id),
      alive: () => client.open && isLive(runtime.id),
    })
    client.upstreams.set(runtime.id, upstream)
    return upstream
  }

  const upstream = (client: Client, runtime: RuntimeView) => client.upstreams.get(runtime.id) ?? connect(client, runtime)

  const sync = (client: Client) => {
    const live = runtimes.live()
    for (const runtime of live) upstream(client, runtime)
    for (const [id, link] of client.upstreams) {
      if (live.some(runtime => runtime.id === id)) continue
      link.close()
      client.upstreams.delete(id)
      fail(client, id)
    }
  }

  const close = (client: Client) => {
    for (const link of client.upstreams.values()) link.close()
    client.upstreams.clear()
  }

  return { upstream, sync, close }
}
