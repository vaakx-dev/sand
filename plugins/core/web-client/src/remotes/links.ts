import type { HelloValues } from '@sand/host-hub/contract'
import type { Remote, RemoteInvite } from '@sand/host-remotes/contract'
import type { ConnectionInfo, WireState } from '../contract'
import { createHostAuth } from '../auth/host'
import { learn } from '../connection/book'
import { createPcConnection } from '../connection/pc'
import type { Call, Heard } from '../integrations/socket'

interface Link {
  remote: Remote
  state(): WireState
  info(): ConnectionInfo
  call: Call
  fetch(path: string, init?: RequestInit): Promise<Response>
  nudge(): void
  close(): void
}

export interface LinkHandlers {
  hello(device: string, values: HelloValues): void
  since(device: string): string | undefined
  event(device: string, heard: Heard): void
  drop(device: string): void
  keep(devices: Set<string>): void
  state(): void
}

type Invite = (id: string) => Promise<RemoteInvite>

const urlsOf = (remote: Remote) => [remote.url, ...remote.urls]

const openLink = (remote: Remote, invite: Invite, handlers: () => LinkHandlers): Link => {
  const auth = createHostAuth({
    base: () => connection.base() ?? link.remote.url,
    offer: () => invite(link.remote.id),
  })
  learn(remote.id, urlsOf(remote))
  const connection = createPcConnection({
    seeds: () => urlsOf(link.remote),
    expected: () => link.remote.id,
    ticket: auth.socketUrl,
    offline: `${remote.name} is offline`,
    event: heard => handlers().event(link.remote.id, heard),
    hello: values => handlers().hello(link.remote.id, values),
    since: () => handlers().since(link.remote.id),
    changed: () => handlers().state(),
  })
  const link: Link = {
    remote,
    state: connection.state,
    info: connection.info,
    call: connection.call,
    fetch: auth.fetch,
    nudge: connection.nudge,
    close: connection.close,
  }
  return link
}

const sameRoutes = (a: Remote, b: Remote) => urlsOf(a).join('\n') === urlsOf(b).join('\n')

const idle: LinkHandlers = { hello() {}, since: () => undefined, event() {}, drop() {}, keep() {}, state() {} }

export const createLinks = (invite: Invite) => {
  const links = new Map<string, Link>()
  let handlers = idle

  const drop = (id: string) => {
    links.get(id)?.close()
    links.delete(id)
    handlers.drop(id)
  }

  const refresh = (link: Link, remote: Remote) => {
    const moved = !sameRoutes(link.remote, remote)
    link.remote = remote
    if (!moved) return
    learn(remote.id, urlsOf(remote))
    if (link.state() !== 'open') link.nudge()
  }

  return {
    listen(next: LinkHandlers) {
      handlers = next
    },
    get: (id: string) => links.get(id),
    list: () => [...links.values()],
    sync(remotes: Remote[]) {
      const wanted = new Set(remotes.map(remote => remote.id))
      for (const id of [...links.keys()]) if (!wanted.has(id)) drop(id)
      handlers.keep(wanted)
      for (const remote of remotes) {
        const link = links.get(remote.id)
        if (link) refresh(link, remote)
        else links.set(remote.id, openLink(remote, invite, () => handlers))
      }
      handlers.state()
    },
    close() {
      for (const link of links.values()) link.close()
      links.clear()
    },
  }
}

export type Links = ReturnType<typeof createLinks>
