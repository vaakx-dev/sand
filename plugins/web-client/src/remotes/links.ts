import type { Hello, Remote, WireEvent, WireRequest, WireState } from '@sand/protocol'
import { socketUrl } from '@sand/kit'
import { backoff, reconnecting } from '../wire/reconnecting'

export interface Link {
  remote: Remote
  state(): WireState
  call<T = unknown>(request: WireRequest): Promise<T>
  close(): void
}

export interface LinkHandlers {
  hello(device: string, hello: Hello): void
  event(device: string, event: WireEvent): void
  drop(device: string): void
  state(): void
}

const openLink = (remote: Remote, handlers: () => LinkHandlers): Link => {
  const connection = reconnecting({
    url: socketUrl(remote.url, remote.token),
    offline: `${remote.name} is offline`,
    backoff: backoff(5000, 60_000),
    event: event => handlers().event(remote.id, event),
    hello: hello => handlers().hello(remote.id, hello),
    state: () => handlers().state(),
  })
  return { remote, state: connection.state, call: connection.call, close: connection.close }
}

const same = (a: Remote, b: Remote) => a.url === b.url && a.token === b.token && a.name === b.name

const idle: LinkHandlers = { hello() {}, event() {}, drop() {}, state() {} }

export const createLinks = () => {
  const links = new Map<string, Link>()
  let handlers = idle

  const drop = (id: string) => {
    links.get(id)?.close()
    links.delete(id)
    handlers.drop(id)
  }

  return {
    listen(next: LinkHandlers) {
      handlers = next
    },
    get: (id: string) => links.get(id),
    list: () => [...links.values()],
    sync(remotes: Remote[]) {
      const wanted = new Map(remotes.map(remote => [remote.id, remote]))
      for (const [id, link] of [...links]) {
        const next = wanted.get(id)
        if (!next || !same(next, link.remote)) drop(id)
      }
      for (const remote of remotes) if (!links.has(remote.id)) links.set(remote.id, openLink(remote, () => handlers))
      handlers.state()
    },
    close() {
      for (const link of links.values()) link.close()
      links.clear()
    },
  }
}

export type Links = ReturnType<typeof createLinks>
