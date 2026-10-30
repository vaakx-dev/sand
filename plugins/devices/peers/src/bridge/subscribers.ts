import { type Peers, peersChange, peersEvent, peersOpened } from '@sand/devices-contract'
import { type WireEvent, wireEvent } from '@sand/host-hub/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import type { Dispose } from 'drydock'

export const runtimeSubscribers = (peers: Peers, runtimes: () => Runtimes | undefined) => {
  const wanted = new Map<string, Set<string>>()
  const forwarding = new Map<string, Dispose>()

  const tell = <P>(runtime: string, event: WireEvent<P>, payload: P) => {
    if (runtimes()?.tell(runtime, event, payload)) return
    wanted.delete(runtime)
    refresh()
  }

  const forward = (name: string) =>
    peers.on(wireEvent<unknown>(name), (payload, pc) => {
      for (const [runtime, names] of [...wanted]) if (names.has(name)) tell(runtime, peersEvent, { pc, name, payload })
    })

  const refresh = () => {
    const names = new Set([...wanted.values()].flatMap(set => [...set]))
    for (const [name, stop] of [...forwarding]) {
      if (names.has(name)) continue
      stop()
      forwarding.delete(name)
    }
    for (const name of names) if (!forwarding.has(name)) forwarding.set(name, forward(name))
  }

  return {
    listen(runtime: string, events: string[]) {
      wanted.set(runtime, new Set(events))
      refresh()
    },
    changed() {
      const list = peers.list()
      for (const runtime of [...wanted.keys()]) tell(runtime, peersChange, list)
    },
    opened(pc: string) {
      for (const runtime of [...wanted.keys()]) tell(runtime, peersOpened, pc)
    },
    close() {
      for (const stop of forwarding.values()) stop()
      forwarding.clear()
      wanted.clear()
    },
  }
}
