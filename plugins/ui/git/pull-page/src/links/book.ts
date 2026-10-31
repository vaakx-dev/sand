import { pcsChange, wireHello } from '@sand/devices-contract'
import type { PullRef } from '@sand/github/contract'
import { pullLinksClient, type ThreadPulls } from '@sand/pull-links/contract'
import { sig } from '@vaakx-dev/vrui'
import type { PageContext } from '../inject'
import { lowerKey } from '../pull/ref'

export interface LinkedThread {
  session: string
  device: string
  watching: boolean
}

type SessionLinks = Map<string, { device: string; links: ThreadPulls['links'] }>

export const linkBook = (ctx: PageContext) => {
  const sessions = sig<SessionLinks>(new Map())

  const put = (device: string, all: ThreadPulls[], replace: boolean) =>
    sessions.update(current => {
      const next: SessionLinks = new Map(current)
      if (replace) for (const [session, entry] of next) if (entry.device === device) next.delete(session)
      for (const item of all) next.set(item.session, { device, links: item.links })
      return next
    })

  const loadDevice = (device: string) =>
    ctx
      .get(pullLinksClient)
      ?.linksAll(device)
      .then(all => put(device, all, true))
      .catch(() => undefined)

  const onlineIds = () => new Set(ctx.pcs.list().flatMap(pc => (pc.online ? [pc.id] : [])))
  let online = onlineIds()

  const load = () => {
    online = onlineIds()
    for (const device of online) void loadDevice(device)
  }

  const loadNewlyOnline = () => {
    const next = onlineIds()
    for (const device of next) if (!online.has(device)) void loadDevice(device)
    online = next
  }

  const of = (pull: PullRef): LinkedThread[] => {
    const key = lowerKey(pull)
    const found: LinkedThread[] = []
    for (const [session, entry] of sessions.get()) {
      const link = entry.links.find(each => lowerKey(each) === key)
      if (link) found.push({ session, device: entry.device, watching: link.watching })
    }
    return found
  }

  ctx.watch(pullLinksClient, client => {
    if (!client) {
      sessions.set(new Map())
      return
    }
    load()
    return client.onChange((payload, device) => put(device, [payload], false))
  })
  ctx.on(wireHello, load)
  ctx.on(pcsChange, loadNewlyOnline)

  return { of, put, reload: load }
}

export type LinkBook = ReturnType<typeof linkBook>
