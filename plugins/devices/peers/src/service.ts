import type { Peers } from '@sand/devices-contract'
import { callEachOf } from './each'
import type { Events } from './links/events'
import { notPaired, type PeerLinks } from './links/links'
import type { Listeners } from './links/listeners'
import { directUrlOf, helloOf, viewOf } from './links/view'

interface PeersParts {
  links: PeerLinks
  events: Events
  opens: Listeners<[pc: string]>
  changes: Listeners<[]>
}

export const createPeers = ({ links, events, opens, changes }: PeersParts): Peers => {
  const connected = () =>
    links
      .all()
      .filter(link => link.open())
      .map(link => link.record.id)

  return {
    list: () => links.all().map(viewOf),
    get(pc) {
      const link = links.get(pc)
      return link && viewOf(link)
    },
    connected,
    call: links.call,
    callEach: callEachOf(connected, links.call),
    async fetch(pc, path, init, options) {
      const link = links.get(pc)
      if (!link) throw notPaired(pc)
      return link.connection.fetch(path, init, options)
    },
    on: events.on,
    hello: (field, pc) => helloOf(links.get(pc), field),
    directUrl: pc => directUrlOf(links.get(pc)),
    retry(pc) {
      for (const link of links.all()) if (!pc || link.record.id === pc) link.connection.retry()
    },
    onOpen: opens.add,
    onChange: changes.add,
  }
}
